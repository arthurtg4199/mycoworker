"use server";

import { revalidatePath } from "next/cache";
import {
  isHandlingMode,
  type HandlingMode,
} from "@/lib/assistant-mode";
import {
  fieldsFromProfile,
  type BusinessProfileFields,
  type ProfileFormState,
} from "@/lib/business-profile";
import { getAuthUser } from "@/lib/auth";
import { upsertHandlingMode } from "@/lib/db/assistant";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
} from "@/lib/db/queries";
import { upsertBusinessProfile } from "@/lib/db/profile";
import { profileUpsert } from "@/lib/db/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type HandlingModeState = {
  ok?: boolean;
  demo?: boolean;
  mode?: HandlingMode;
  message?: string;
};

export async function saveHandlingMode(
  _previous: HandlingModeState,
  formData: FormData,
): Promise<HandlingModeState> {
  const mode = formData.get("mode");
  if (!isHandlingMode(mode)) {
    return {
      ok: false,
      message: "Pick Ask me first, Auto-reply, or Paused.",
    };
  }

  if (!getSupabaseEnv()) {
    return {
      ok: true,
      demo: true,
      mode,
      message: "Saved on this device.",
    };
  }

  const user = await getAuthUser();
  if (!user) {
    return { ok: false, message: "Sign in to save how I handle chats." };
  }

  try {
    await upsertHandlingMode(user.id, mode);
    revalidatePath("/", "layout");
    return {
      ok: true,
      mode,
      message: "Saved. I'll handle chats this way.",
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        ok: true,
        demo: true,
        mode,
        message: "Saved on this device.",
      };
    }
    console.error(
      "MyCoWorker could not save the handling mode.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return {
      ok: false,
      message: "I could not save that just now. Try again.",
    };
  }
}

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function savedFields(input: ReturnType<typeof profileUpsert>): BusinessProfileFields {
  return fieldsFromProfile({
    business_name: input.business_name,
    what_they_sell: input.what_they_sell,
    hours: input.hours,
    location: input.location,
    reply_tone: input.reply_tone,
    currency: input.currency,
  });
}

export async function saveBusinessProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  let saved: ReturnType<typeof profileUpsert>;
  try {
    saved = profileUpsert({
      business_name: textField(formData, "business_name"),
      what_they_sell: textField(formData, "what_they_sell"),
      hours: textField(formData, "hours"),
      location: textField(formData, "location"),
      reply_tone: textField(formData, "reply_tone"),
      currency: textField(formData, "currency"),
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Check the shop details and try again.",
    };
  }

  const fields = savedFields(saved);

  if (!getSupabaseEnv()) {
    return {
      ok: true,
      demo: true,
      fields,
      message:
        "Saved on this device. Sign in later to keep it with your account.",
    };
  }

  const user = await getAuthUser();
  if (!user) {
    return { ok: false, message: "Sign in to save your shop." };
  }

  try {
    const profile = await upsertBusinessProfile(user.id, saved);
    const fresh = fieldsFromProfile(profile);
    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/buyers");
    revalidatePath("/analytics");
    revalidatePath("/assistant");
    return {
      ok: true,
      fields: fresh,
      message: "Saved. I'll use this when I help with your chats.",
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        ok: true,
        demo: true,
        fields,
        message:
          "Saved on this device. Sign in later to keep it with your account.",
      };
    }
    console.error(
      "MyCoWorker could not save the business profile.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return {
      ok: false,
      message: "I could not save the shop just now. Try again.",
    };
  }
}
