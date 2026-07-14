import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Role } from "@/lib/types";

export type AuthProfile = {
  email: string;
  name: string;
  role: Role;
  userId: string;
};

type Claims = {
  app_metadata?: Record<string, unknown>;
  email?: string;
  sub?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseConfig = {
  anonKey: string;
  url: string;
};

export function safeRedirectPath(path: FormDataEntryValue | null | string | undefined) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

export function getSiteUrl(origin?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? origin ?? "http://localhost:3000";
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, url };
}

export function getSupabaseConfigOrThrow() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return config;
}

export async function createSupabaseServerClient() {
  const config = getSupabaseConfigOrThrow();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
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

function readRole(claims: Claims): Role {
  const trustedRole = claims.app_metadata?.role;
  const requestedRole = claims.user_metadata?.role;

  if (trustedRole === "admin" || trustedRole === "driver" || trustedRole === "recipient") {
    return trustedRole;
  }

  return requestedRole === "driver" ? "driver" : "recipient";
}

export function profileFromClaims(claims: Claims): AuthProfile {
  const name = claims.user_metadata?.name;

  return {
    email: typeof claims.email === "string" ? claims.email : "",
    name: typeof name === "string" && name.trim() !== "" ? name : "Signed-in user",
    role: readRole(claims),
    userId: typeof claims.sub === "string" ? claims.sub : "",
  };
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

  return profileFromClaims(data.claims as Claims);
}
