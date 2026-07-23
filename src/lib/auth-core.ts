import type { Role } from "./types";

export type AuthProfile = {
  email: string;
  name: string;
  role: Role;
  userId: string;
};

export type AuthClaims = {
  app_metadata?: Record<string, unknown>;
  email?: string;
  sub?: string;
  user_metadata?: Record<string, unknown>;
};

export function safeRedirectPath(path: FormDataEntryValue | null | string | undefined) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return "/dashboard";
  }

  return path;
}

function readRole(claims: AuthClaims): Role {
  const trustedRole = claims.app_metadata?.role;
  const requestedRole = claims.user_metadata?.role;

  if (trustedRole === "admin" || trustedRole === "driver" || trustedRole === "recipient") {
    return trustedRole;
  }

  return requestedRole === "driver" ? "driver" : "recipient";
}

export function profileFromClaims(claims: AuthClaims): AuthProfile {
  const name = claims.user_metadata?.name;

  return {
    email: typeof claims.email === "string" ? claims.email : "",
    name: typeof name === "string" && name.trim() !== "" ? name : "Signed-in user",
    role: readRole(claims),
    userId: typeof claims.sub === "string" ? claims.sub : "",
  };
}
