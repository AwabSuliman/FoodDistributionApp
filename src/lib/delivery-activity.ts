import type { DeliveryActivity, RequestStatus } from "./types";

export type DeliveryActivityInput = {
  actorName?: string;
  assignedDriverName?: string;
  eventType: string;
  fromStatus?: RequestStatus;
  id: string;
  note?: string;
  occurred: string;
  toStatus?: RequestStatus;
};

export function makeDeliveryActivity(input: DeliveryActivityInput): DeliveryActivity {
  if (input.eventType === "claimed") {
    return {
      detail: input.actorName ? `${input.actorName} accepted this delivery.` : "A driver accepted this delivery.",
      id: input.id,
      occurred: input.occurred,
      title: "Delivery claimed",
    };
  }

  if (input.eventType === "assigned") {
    return {
      detail: input.assignedDriverName
        ? `${input.assignedDriverName} was assigned by an administrator.`
        : "An approved driver was assigned by an administrator.",
      id: input.id,
      occurred: input.occurred,
      title: "Driver assigned",
    };
  }

  if (input.eventType === "unclaimed") {
    return {
      detail: "The delivery was returned to the available queue.",
      id: input.id,
      occurred: input.occurred,
      title: "Delivery unclaimed",
    };
  }

  return {
    detail:
      input.fromStatus && input.toStatus
        ? `${input.fromStatus} changed to ${input.toStatus}.${input.toStatus === "Not delivered" && input.note ? ` Reason: ${input.note}` : ""}`
        : "The delivery status was updated.",
    id: input.id,
    occurred: input.occurred,
    title: input.toStatus ? `Status: ${input.toStatus}` : "Status updated",
  };
}
