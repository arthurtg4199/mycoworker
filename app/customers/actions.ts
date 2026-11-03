"use server";

import { revalidatePath } from "next/cache";
import type { CustomerStage } from "@/lib/db/types";
import { getAuthUser } from "@/lib/auth";
import { saveCustomerCrm } from "@/lib/db/crm";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
} from "@/lib/db/queries";
import { assertId, customerCrmUpdate } from "@/lib/db/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type CustomerFormState = {
  ok?: boolean;
  demo?: boolean;
  message?: string;
  stage?: CustomerStage;
  notes?: string;
};

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function saveCustomerDetails(
  _previous: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const id = textField(formData, "id").trim();
  const stage = textField(formData, "stage");
  const notes = textField(formData, "notes");

  let saved: ReturnType<typeof customerCrmUpdate>;
  try {
    saved = customerCrmUpdate({ stage, notes });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Check the stage and notes, then try again.",
    };
  }

  if (!id) {
    return { ok: false, message: "That customer is not on your list." };
  }

  if (!getSupabaseEnv()) {
    return {
      ok: true,
      demo: true,
      stage: saved.stage,
      notes: saved.notes ?? "",
      message: "Saved on this device.",
    };
  }

  try {
    assertId(id, "Customer");
  } catch {
    return {
      ok: false,
      message: "This is a sample customer. Your own notes save after someone messages you.",
    };
  }

  const user = await getAuthUser();
  if (!user) {
    return { ok: false, message: "Sign in to save this customer." };
  }

  try {
    const result = await saveCustomerCrm(id, { stage: saved.stage, notes });
    if (!result.ok) return { ok: false, message: result.message };
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return {
      ok: true,
      stage: saved.stage,
      notes: saved.notes ?? "",
      message: result.stageReady
        ? "Saved."
        : "Notes saved. Stage needs the latest database migration before it can stick.",
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        ok: true,
        demo: true,
        stage: saved.stage,
        notes: saved.notes ?? "",
        message: "Saved on this device.",
      };
    }
    console.error(
      "MyCoWorker could not save that customer.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return {
      ok: false,
      message: "I could not save that just now. Try again.",
    };
  }
}
