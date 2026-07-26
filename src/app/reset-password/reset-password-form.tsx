"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";
import type { AuthFormState } from "../login/actions";

const initialState: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-[#d8ded7] bg-white p-5 shadow-sm">
      <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
        New password
        <input
          autoComplete="new-password"
          className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
        Confirm password
        <input
          autoComplete="new-password"
          className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
          minLength={8}
          name="passwordConfirmation"
          required
          type="password"
        />
      </label>

      {state.error && (
        <p
          aria-live="polite"
          className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
        >
          {state.error}
        </p>
      )}

      <button
        className="rounded-md bg-[#1f5d54] px-4 py-3 font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#9aaaa5]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
