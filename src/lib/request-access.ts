import type { RequestStatus, Role } from "./types";

export function canSubmitRecipientRequest(role: Role | undefined, hasActiveRequest: boolean) {
  if (!role) return true;
  if (role === "admin") return true;
  return role === "recipient" && !hasActiveRequest;
}

export function canEditRequest(status: RequestStatus) {
  return status === "Submitted" || status === "Under review";
}

export function canRecipientEditRequest(role: Role | undefined, status: RequestStatus) {
  return role === "recipient" && canEditRequest(status);
}

export function requestAssignmentAction(status: RequestStatus): "assign" | "unassign" | null {
  if (status === "Approved" || status === "Not delivered") return "assign";
  if (status === "Driver assigned" || status === "Heading to pickup") return "unassign";
  return null;
}
