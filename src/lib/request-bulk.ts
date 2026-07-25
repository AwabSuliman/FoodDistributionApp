import type { DistributionRequest, RequestStatus } from "./types";

export type BulkRequestOperation = "approve" | "assign" | "review";

const bulkSelectableStatuses = new Set<RequestStatus>([
  "Submitted",
  "Under review",
  "Approved",
  "Not delivered",
]);

export function isBulkSelectable(status: RequestStatus) {
  return bulkSelectableStatuses.has(status);
}

export function getBulkRequestOperation(requests: DistributionRequest[]): BulkRequestOperation | null {
  if (requests.length === 0) return null;
  if (requests.every((request) => request.status === "Submitted")) return "review";
  if (requests.every((request) => request.status === "Under review")) return "approve";
  if (requests.every((request) => request.status === "Approved" || request.status === "Not delivered")) {
    return "assign";
  }
  return null;
}
