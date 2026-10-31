import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { isReplyTone, type ReplyTone } from "@/lib/business-profile";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
} from "@/lib/db/queries";
import type { BusinessProfile, BusinessProfileInput } from "@/lib/db/types";
import { assertId, profileUpsert } from "@/lib/db/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type BusinessProfileSource = "demo" | "live" | "unavailable";

export type BusinessProfileView = {
  source: BusinessProfileSource;
  profile: BusinessProfile | null;
  notice: string | null;
};

export type ShopFacts = {
  business_name: string;
  what_they_sell: string | null;
  hours: string | null;
  location: string | null;
  reply_tone: ReplyTone;
  currency: string | null;
};

const profileColumns =
  "user_id, business_name, what_they_sell, hours, location, reply_tone, currency, created_at, updated_at";

function throwQuery(error: PostgrestError): never {
  throw new DatabaseQueryError(error.message, error.code);
}

async function database() {
  if (!getSupabaseEnv()) throw new DatabaseNotConfiguredError();
  return createClient();
}

function profileFromRow(row: {
  user_id: string;
  business_name: string;
  what_they_sell: string | null;
  hours: string | null;
  location: string | null;
  reply_tone: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}): BusinessProfile {
  const currency = row.currency?.trim().toUpperCase() ?? null;
  return {
    user_id: row.user_id,
    business_name: row.business_name,
    what_they_sell: row.what_they_sell,
    hours: row.hours,
    location: row.location,
    reply_tone: isReplyTone(row.reply_tone) ? row.reply_tone : null,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const db = await database();
  const { data, error } = await db
    .from("business_profiles")
    .select(profileColumns)
    .maybeSingle();
  if (error) throwQuery(error);
  return data ? profileFromRow(data) : null;
}

export async function upsertBusinessProfile(
  userId: string,
  input: BusinessProfileInput,
): Promise<BusinessProfile> {
  const db = await database();
  const { data, error } = await db
    .from("business_profiles")
    .upsert(
      { ...profileUpsert(input), user_id: assertId(userId, "Account") },
      { onConflict: "user_id" },
    )
    .select(profileColumns)
    .single();
  if (error) throwQuery(error);
  if (!data) {
    throw new DatabaseQueryError("The database did not return a row.", "PGRST116");
  }
  return profileFromRow(data);
}

/**
 * Demo mode when Supabase is unset: no saved row, the screen uses a sample shop.
 * A signed-in account with no row returns an empty profile.
 * A failed read stays empty and says so, instead of showing the sample shop.
 */
export const loadBusinessProfile = cache(
  async (): Promise<BusinessProfileView> => {
    if (!getSupabaseEnv()) {
      return { source: "demo", profile: null, notice: null };
    }

    try {
      const profile = await getBusinessProfile();
      return { source: "live", profile, notice: null };
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) {
        return { source: "demo", profile: null, notice: null };
      }
      console.error(
        "MyCoWorker could not load the business profile.",
        error instanceof Error ? error.message : error,
      );
      return {
        source: "unavailable",
        profile: null,
        notice: "I could not open your shop details yet. Refresh in a moment.",
      };
    }
  },
);

/** Saved shop for screens that already greet the owner. Demo stays on sample copy. */
export function shopFacts(view: BusinessProfileView): ShopFacts | null {
  if (view.source !== "live" || !view.profile) return null;
  return {
    business_name: view.profile.business_name,
    what_they_sell: view.profile.what_they_sell,
    hours: view.profile.hours,
    location: view.profile.location,
    reply_tone: view.profile.reply_tone ?? "friendly",
    currency: view.profile.currency,
  };
}
