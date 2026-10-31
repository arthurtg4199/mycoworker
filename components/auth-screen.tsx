"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/app/auth/actions";
import { ChooseAssistant } from "@/components/pa-preference";

type Mode = "sign-in" | "sign-up";

const phoneFrame =
  "relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-white sm:shadow-[0_0_0_1px_rgba(80,60,120,0.06),0_24px_60px_rgba(70,50,30,0.08)]";

export function AuthScreen({ setup }: { setup?: "incomplete" }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pending, setPending] = useState(false);
  const [hideNotice, setHideNotice] = useState(false);
  const params = useSearchParams();
  const linkFailed = params.get("notice") === "confirm";
  const nextPath = params.get("next") ?? undefined;
  const visibleMessage =
    message ??
    (!hideNotice && linkFailed
      ? "That confirmation link did not work. Try signing in."
      : null);

  function switchMode(next: Mode) {
    setMode(next);
    setMessage(null);
    setConfirmEmail(false);
    setPassword("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setHideNotice(true);
    try {
      const result =
        mode === "sign-in"
          ? await signIn(email, password, nextPath)
          : await signUp(email, password, nextPath);
      if (result?.confirmEmail) {
        setConfirmEmail(true);
        setPending(false);
        return;
      }
      if (result?.message) {
        setMessage(result.message);
        setPending(false);
      }
    } catch (error) {
      const digest =
        typeof error === "object" && error !== null && "digest" in error
          ? String(error.digest)
          : "";
      if (digest.startsWith("NEXT_REDIRECT")) return;
      setMessage("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <div className={phoneFrame}>
      <div className="mcw-scroll flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6 py-10">
        <Image
          src="/logo_final.png"
          alt="MyCoWorker. Your friendly assistant for small business."
          width={880}
          height={620}
          priority
          className="mx-auto h-auto w-52"
        />
        {setup === "incomplete" ? (
          <div className="mt-6 text-center">
            <h1 className="text-[1.65rem] font-extrabold tracking-[-0.04em] text-ink">
              Almost ready
            </h1>
            <p className="mt-2 text-sm leading-5 text-[#5C5870]">
              Add both the project link and the anon key, then redeploy.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-center text-[1.65rem] font-extrabold tracking-[-0.04em] text-ink">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-center text-sm leading-5 text-muted">
              {mode === "sign-in"
                ? "Sign in with your email to open the inbox."
                : "Use your email and a password. Then the inbox is yours."}
            </p>
            {mode === "sign-up" && !confirmEmail ? <ChooseAssistant /> : null}

            {confirmEmail ? (
              <div className="mt-6 rounded-3xl bg-mcw-soft px-4 py-5 text-center">
                <p className="font-bold text-ink">Check your email</p>
                <p className="mt-1 text-sm leading-5 text-[#3C3458]">
                  We sent a confirmation link to {email.trim()}. Open it, then
                  sign in.
                </p>
                <button
                  type="button"
                  className="mt-4 text-sm font-semibold text-mcw"
                  onClick={() => switchMode("sign-in")}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6">
                <label className="block text-sm font-semibold text-ink" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-[#F6F4FB] px-4 py-3 text-base font-semibold text-ink ring-1 ring-transparent outline-none placeholder:font-medium placeholder:text-[#B0ABBE] focus:ring-mcw"
                  placeholder="you@shop.com"
                />

                <label
                  className="mt-4 block text-sm font-semibold text-ink"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl bg-[#F6F4FB] px-4 py-3 text-base font-semibold text-ink ring-1 ring-transparent outline-none placeholder:font-medium placeholder:text-[#B0ABBE] focus:ring-mcw"
                  placeholder="At least 6 characters"
                />

                {visibleMessage ? (
                  <p className="mt-3 text-sm leading-5 font-semibold text-[#9B3A4A]" role="alert">
                    {visibleMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-5 w-full rounded-full bg-mcw py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(108,76,224,0.35)] disabled:opacity-60"
                >
                  {pending
                    ? mode === "sign-in"
                      ? "Signing in…"
                      : "Creating account…"
                    : mode === "sign-in"
                      ? "Sign in"
                      : "Create account"}
                </button>
              </form>
            )}

            {confirmEmail ? null : (
              <p className="mt-4 text-center text-sm text-[#5C5870]">
                {mode === "sign-in" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      className="font-semibold text-mcw"
                      onClick={() => switchMode("sign-up")}
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold text-mcw"
                      onClick={() => switchMode("sign-in")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
