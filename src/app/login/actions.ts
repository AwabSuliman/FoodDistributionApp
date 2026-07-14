"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getSiteUrl, getSupabaseConfig, safeRedirectPath } from "@/lib/auth";
import type { Role } from "@/lib/types";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function readText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function readRole(formData: FormData): Role {
  const role = formData.get("role");

  return role === "driver" ? "driver" : "recipient";
}

function requireSupabaseConfig(): AuthFormState | null {
  return getSupabaseConfig()
    ? null
    : {
        error: "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      };
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configError = requireSupabaseConfig();

  if (configError) {
    return configError;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: readText(formData, "email"),
    password: readText(formData, "password"),
  });

  if (error) {
    return { error: error.message };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const configError = requireSupabaseConfig();

  if (configError) {
    return configError;
  }

  const role = readRole(formData);
  const next = safeRedirectPath(formData.get("next"));
  const headersList = await headers();
  const callbackUrl = new URL("/auth/callback", getSiteUrl(headersList.get("origin") ?? undefined));
  callbackUrl.searchParams.set("next", next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: readText(formData, "email"),
    options: {
      data: {
        name: readText(formData, "name"),
        role,
      },
      emailRedirectTo: callbackUrl.toString(),
    },
    password: readText(formData, "password"),
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect(next);
  }

  return { message: "Account created. Check your email to confirm your sign-in." };
}

export async function signOut() {
  if (getSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
