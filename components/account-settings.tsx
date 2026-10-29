"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/app/auth/actions";
import { useSession } from "@/components/session";

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 w-full rounded-full bg-[#F6F4FB] py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function AccountSettings() {
  const { demoMode, email } = useSession();
  if (demoMode) return null;

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <h3 className="text-sm font-bold text-ink">Your account</h3>
      <p className="mt-1 text-base font-semibold text-ink">
        {email || "Signed in"}
      </p>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </section>
  );
}
