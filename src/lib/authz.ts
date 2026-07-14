"use server";

import { createSupabaseServerClient, getSupabaseConfig, profileFromClaims } from "@/lib/auth";
import type { Role } from "@/lib/types";

function roleCanAccess(actualRole: Role, allowedRoles: Role[]) {
  return actualRole === "admin" || allowedRoles.includes(actualRole);
}

export async function requireAuthenticatedRole(allowedRoles: Role[]) {
  if (!getSupabaseConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    throw new Error("You must be signed in to continue.");
  }

  const profile = profileFromClaims(data.claims);

  if (!roleCanAccess(profile.role, allowedRoles)) {
    throw new Error("You do not have permission to perform this action.");
  }

  return profile;
}
