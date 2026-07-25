import type { AuthProfile } from "./auth-core";
import type { DistributionRequest, PendingDriver, RequestStatus } from "./types";

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

export function getAvailableDriversForProfile(drivers: PendingDriver[], profile: AuthProfile | null) {
  if (!profile || profile.role === "admin") return drivers;
  if (profile.role !== "driver") return [];

  return drivers.filter((driver) =>
    driver.userId
      ? driver.userId === profile.userId
      : driver.email.toLowerCase() === profile.email.toLowerCase(),
  );
}
