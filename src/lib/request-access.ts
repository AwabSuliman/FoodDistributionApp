import type { RequestStatus, Role } from "./types";

export function canSubmitRecipientRequest(role: Role | undefined, hasActiveRequest: boolean) {
  if (!role) return true;
  if (role === "admin") return true;
  return role === "recipient" && !hasActiveRequest;
}

export function canEditRequest(status: RequestStatus) {
  return status === "Submitted" || status === "Under review";
}
