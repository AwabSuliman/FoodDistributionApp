import type { DistributionRequest, RequestStatus } from "./types";

const approvedStatuses = new Set<RequestStatus>([
  "Approved",
  "Driver assigned",
  "Heading to pickup",
  "Picked up",
  "Out for delivery",
  "Delivered",
  "Not delivered",
]);

function boxWeight(request: DistributionRequest) {
  const weight = Number.parseInt(request.boxWeight, 10);
  return Number.isFinite(weight) ? weight : 0;
}

export function makeRequestReport(requests: DistributionRequest[]) {
  const activeRequests = requests.filter((request) => request.status !== "Denied");
  const approvedRequests = requests.filter((request) => approvedStatuses.has(request.status));
  const deliveredRequests = requests.filter((request) => request.status === "Delivered");
  const statuses = [...new Set(requests.map((request) => request.status))];

  return {
    approvedWeightLbs: approvedRequests.reduce((total, request) => total + boxWeight(request), 0),
    deliveredWeightLbs: deliveredRequests.reduce((total, request) => total + boxWeight(request), 0),
    families: activeRequests.length,
    householdMembers: activeRequests.reduce((total, request) => total + request.householdSize, 0),
    statusRows: statuses.map((status) => {
      const matching = requests.filter((request) => request.status === status);
      return {
        families: matching.length,
        householdMembers: matching.reduce((total, request) => total + request.householdSize, 0),
        status,
        weightLbs: matching.reduce((total, request) => total + boxWeight(request), 0),
      };
    }),
  };
}
