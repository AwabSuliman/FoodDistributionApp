"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, getAuthenticatedProfile, getSupabaseConfig } from "@/lib/auth";
import { authErrorMessage, parsePasswordUpdateInput } from "@/lib/auth-input";
import type { AuthFormState } from "../login/actions";

export async function updatePassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseConfig() || !(await getAuthenticatedProfile())) {
    return { error: "Your password reset link has expired. Request a new one." };
  }

  const input = parsePasswordUpdateInput(formData);

  if (!input.ok) {
    return { error: input.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: input.data.password });

  if (error) {
    return { error: authErrorMessage(error.message, "reset") };
  }

  redirect("/dashboard");
}
