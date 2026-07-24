import type { DistributionRequest, RequestStatus } from "./types";

const availableStatuses = new Set<RequestStatus>(["Approved", "Not delivered"]);
const activeClaimStatuses = new Set<RequestStatus>([
  "Driver assigned",
  "Heading to pickup",
  "Picked up",
  "Out for delivery",
]);

export function getDriverRequestBuckets(requests: DistributionRequest[], driverName?: string) {
  return {
    assigned: driverName
      ? requests.filter((request) => request.driver === driverName && activeClaimStatuses.has(request.status))
      : [],
    available: requests.filter((request) => availableStatuses.has(request.status)),
  };
}
