import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { profileFromClaims } from "@/lib/auth-core";
import type { AuthClaims, AuthProfile } from "@/lib/auth-core";
import type { Database } from "@/lib/database.types";

export { profileFromClaims, safeRedirectPath } from "@/lib/auth-core";
export type { AuthProfile } from "@/lib/auth-core";

export type SupabaseConfig = {
  publishableKey: string;
  url: string;
};

export function getSiteUrl(origin?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? origin ?? "http://localhost:3000";
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}

export function getSupabaseConfigOrThrow() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return config;
}

export async function createSupabaseServerClient() {
  const config = getSupabaseConfigOrThrow();
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; options: CookieOptions; value: string }[]) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. The proxy refresh path handles session cookie updates.
        }
      },
    },
  });
}

export async function getAuthenticatedProfile(): Promise<AuthProfile | null> {
  if (!getSupabaseConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return profileFromClaims(data.claims as AuthClaims);
}
