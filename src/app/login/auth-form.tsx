"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export function AuthForm({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signInPending : signUpPending;

  return (
    <div className="mx-auto grid w-full max-w-md gap-5">
      <div className="grid grid-cols-2 rounded-lg border border-[#d7ded7] bg-white p-1 shadow-sm">
        <button
          className={`rounded-md px-4 py-3 text-sm font-bold ${mode === "signin" ? "bg-[#1f5d54] text-white" : "text-[#293532]"}`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`rounded-md px-4 py-3 text-sm font-bold ${mode === "signup" ? "bg-[#1f5d54] text-white" : "text-[#293532]"}`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Create account
        </button>
      </div>

      <form action={mode === "signin" ? signInAction : signUpAction} className="grid gap-4 rounded-lg border border-[#d8ded7] bg-white p-5 shadow-sm">
        <input name="next" type="hidden" value={nextPath} />

        {mode === "signup" && (
          <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
            Full name
            <input
              className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
              name="name"
              required
              type="text"
            />
          </label>
        )}

        <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
          Email
          <input
            className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
            name="email"
            required
            type="email"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
          Password
          <input
            className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>

        {mode === "signup" && (
          <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
            Role
            <select
              className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
              defaultValue="recipient"
              name="role"
            >
              <option value="recipient">Recipient</option>
              <option value="driver">Driver</option>
            </select>
          </label>
        )}

        {state.error && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.error}</p>}
        {state.message && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            {state.message}
          </p>
        )}

        <button
          className="rounded-md bg-[#1f5d54] px-4 py-3 font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#9aaaa5]"
          disabled={pending}
          type="submit"
        >
          {pending ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
