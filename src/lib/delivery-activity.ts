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
  if (input.eventType === "request_submitted") {
    return {
      detail: "The recipient sent this request to the mosque.",
      id: input.id,
      occurred: input.occurred,
      title: "Request submitted",
    };
  }

  if (input.eventType === "request_edited") {
    const editor =
      input.note === "admin"
        ? "An administrator"
        : input.note === "recipient"
          ? "The recipient"
          : "A request participant";

    return {
      detail: `${editor} updated the household or delivery details.`,
      id: input.id,
      occurred: input.occurred,
      title: "Request details updated",
    };
  }

  if (input.eventType === "request_status_changed") {
    const statusContent: Partial<Record<RequestStatus, { detail: string; title: string }>> = {
      Approved: {
        detail: "An administrator approved the request for delivery.",
        title: "Request approved",
      },
      Denied: {
        detail: input.note
          ? `An administrator denied the request. Reason: ${input.note}`
          : "An administrator denied the request.",
        title: "Request denied",
      },
      "Under review": {
        detail: "An administrator started reviewing the request.",
        title: "Review started",
      },
    };
    const content = input.toStatus ? statusContent[input.toStatus] : undefined;

    if (content) {
      return { ...content, id: input.id, occurred: input.occurred };
    }
  }

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
