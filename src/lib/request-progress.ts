import type { RequestStatus } from "./types";

export const requestProgressOrder: RequestStatus[] = [
  "Submitted",
  "Under review",
  "Approved",
  "Driver assigned",
  "Heading to pickup",
  "Picked up",
  "Out for delivery",
  "Delivered",
];

export function getRequestProgressIndex(status: RequestStatus) {
  if (status === "Denied") return requestProgressOrder.indexOf("Under review");
  if (status === "Not delivered") return requestProgressOrder.indexOf("Out for delivery");
  return requestProgressOrder.indexOf(status);
}
