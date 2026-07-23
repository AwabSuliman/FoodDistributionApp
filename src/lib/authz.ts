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

export async function requireApprovedDriverOrAdmin() {
  const profile = await requireAuthenticatedRole(["driver", "admin"]);

  if (!profile || profile.role === "admin") return profile;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("driver_applications")
    .select("status")
    .eq("user_id", profile.userId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Your driver application must be approved before you can manage deliveries.");
  }

  return profile;
}
