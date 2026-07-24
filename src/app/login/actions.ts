"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getSiteUrl, getSupabaseConfig, safeRedirectPath } from "@/lib/auth";
import {
  authErrorMessage,
  parsePasswordResetRequest,
  parseSignInInput,
  parseSignUpInput,
} from "@/lib/auth-input";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function requireSupabaseConfig(): AuthFormState | null {
  return getSupabaseConfig()
    ? null
    : {
        error: "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      };
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configError = requireSupabaseConfig();

  if (configError) {
    return configError;
  }

  const input = parseSignInInput(formData);

  if (!input.ok) {
    return { error: input.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);

  if (error) {
    return { error: authErrorMessage(error.message, "signin") };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configError = requireSupabaseConfig();

  if (configError) {
    return configError;
  }

  const input = parseSignUpInput(formData);

  if (!input.ok) {
    return { error: input.error };
  }

  const next = safeRedirectPath(formData.get("next"));
  const headersList = await headers();
  const callbackUrl = new URL("/auth/callback", getSiteUrl(headersList.get("origin") ?? undefined));
  callbackUrl.searchParams.set("next", next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.data.email,
    options: {
      data: {
        name: input.data.name,
        role: input.data.role,
      },
      emailRedirectTo: callbackUrl.toString(),
    },
    password: input.data.password,
  });

  if (error) {
    return { error: authErrorMessage(error.message, "signup") };
  }

  if (data.session) {
    redirect(next);
  }

  return { message: "Account created. Check your email to confirm your sign-in." };
}

export async function requestPasswordReset(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configError = requireSupabaseConfig();

  if (configError) {
    return configError;
  }

  const input = parsePasswordResetRequest(formData);

  if (!input.ok) {
    return { error: input.error };
  }

  const headersList = await headers();
  const callbackUrl = new URL("/auth/callback", getSiteUrl(headersList.get("origin") ?? undefined));
  callbackUrl.searchParams.set("next", "/reset-password");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.data.email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    return { error: authErrorMessage(error.message, "reset") };
  }

  return { message: "If an account exists for that email, a password reset link is on the way." };
}

export async function signOut() {
  if (getSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
