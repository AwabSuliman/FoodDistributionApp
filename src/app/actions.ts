"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedDriverOrAdmin, requireAuthenticatedRole } from "@/lib/authz";
import {
  assignRequest,
  activateSeason,
  bulkAssignRequests,
  bulkApproveDrivers,
  bulkSetRequestStatus,
  claimRequest,
  createDriverApplication,
  createRequest,
  resolvePendingDriver,
  setDeliveryStatus,
  setRequestIntake,
  setRequestStatus,
  unclaimRequest,
  updateRequestDetails,
} from "@/lib/data";
import { PublicError, publicErrorMessage } from "@/lib/errors";
import { inputLimits, validateRequiredText } from "@/lib/input-limits";
import { parseSeasonInput } from "@/lib/season-input";
import type { DriverApplicationDecision, RequestStatus } from "@/lib/types";

export type DashboardActionResult = { error: string; ok: false } | { ok: true };

const editableStatuses = new Set<RequestStatus>(["Under review", "Approved", "Denied"]);
const deliveryStatuses = new Set<RequestStatus>([
  "Heading to pickup",
  "Picked up",
  "Out for delivery",
  "Delivered",
  "Not delivered",
]);
const driverApplicationDecisions = new Set<DriverApplicationDecision>(["approved", "denied"]);

function revalidateDashboards() {
  revalidatePath("/");
  revalidatePath("/dashboard");
}

async function runDashboardAction(action: () => Promise<void>): Promise<DashboardActionResult> {
  try {
    await action();
    revalidateDashboards();
    return { ok: true };
  } catch (error) {
    return { error: publicErrorMessage(error), ok: false };
  }
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const result = validateRequiredText(value, label, maxLength);
  if (!result.ok) throw new PublicError(result.error);
  return result.data;
}

function readRequiredText(formData: FormData, field: string, label: string, maxLength: number) {
  return requiredText(formData.get(field), label, maxLength);
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PublicError("Enter a valid email address.");
  }
}

function readRequestDetails(formData: FormData) {
  const householdSize = Number(
    readRequiredText(formData, "householdSize", "Household size", 4),
  );
  const email = readRequiredText(formData, "email", "Email", inputLimits.email);

  if (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 100) {
    throw new PublicError("Household size must be between 1 and 100.");
  }

  validateEmail(email);

  return {
    address: readRequiredText(formData, "address", "Address", inputLimits.address),
    email,
    householdSize,
    instructions: readRequiredText(
      formData,
      "instructions",
      "Delivery instructions",
      inputLimits.instructions,
    ),
    phone: readRequiredText(formData, "phone", "Phone number", inputLimits.phone),
    recipient: readRequiredText(formData, "recipient", "Full name", inputLimits.name),
  };
}

function readRequestIds(formData: FormData) {
  const ids = [
    ...new Set(
      formData
        .getAll("requestId")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  if (ids.length === 0) throw new PublicError("Select at least one request.");
  if (ids.length > 200) throw new PublicError("Select no more than 200 requests at once.");

  return ids;
}

function readDriverIds(formData: FormData) {
  const ids = [
    ...new Set(
      formData
        .getAll("driverId")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  if (ids.length === 0) throw new PublicError("Select at least one driver application.");
  if (ids.length > 200) throw new PublicError("Select no more than 200 driver applications at once.");

  return ids;
}

export async function submitRequest(formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    const profile = await requireAuthenticatedRole(["recipient"]);
    await createRequest(profile, readRequestDetails(formData));
  });
}

export async function updateRequestStatus(id: string, status: RequestStatus): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);

    if (!editableStatuses.has(status)) {
      throw new PublicError("Unsupported request status.");
    }

    await setRequestStatus(id, status);
  });
}

export async function bulkUpdateRequests(
  status: "Approved" | "Under review",
  formData: FormData,
): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);
    await bulkSetRequestStatus(readRequestIds(formData), status);
  });
}

export async function bulkAssignDeliveries(formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);
    await bulkAssignRequests(
      readRequestIds(formData),
      readRequiredText(formData, "driver", "Driver", inputLimits.email),
    );
  });
}

export async function bulkApproveDriverApplications(formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);
    await bulkApproveDrivers(readDriverIds(formData));
  });
}

export async function editRequest(id: string, formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);

    const details = readRequestDetails(formData);
    const boxWeightLbs = Number(
      readRequiredText(formData, "boxWeightLbs", "Box weight", 5),
    );

    if (!Number.isInteger(boxWeightLbs) || boxWeightLbs < 1 || boxWeightLbs > 1000) {
      throw new PublicError("Box weight must be between 1 and 1,000 lb.");
    }

    await updateRequestDetails(id, {
      ...details,
      boxWeightLbs,
    });
  });
}

export async function editOwnRequest(id: string, formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["recipient"]);

    const details = readRequestDetails(formData);

    await updateRequestDetails(id, {
      ...details,
      boxWeightLbs: details.householdSize * 7,
    });
  });
}

export async function createSeason(formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);
    const input = parseSeasonInput(formData);

    if (!input.ok) throw new PublicError(input.error);

    await activateSeason(input.data);
  });
}

export async function updateRequestIntake(acceptingRequests: boolean): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);
    await setRequestIntake(acceptingRequests);
  });
}

export async function updateDeliveryStatus(
  id: string,
  status: RequestStatus,
  formData?: FormData,
): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireApprovedDriverOrAdmin();

    if (!deliveryStatuses.has(status)) {
      throw new PublicError("Unsupported delivery status.");
    }

    let note: string | undefined;

    if (status === "Not delivered") {
      if (!formData) throw new PublicError("A reason is required when a delivery is missed.");
      note = readRequiredText(formData, "reason", "Missed-delivery reason", 500);

      if (note.length < 5) {
        throw new PublicError("The missed-delivery reason must be at least 5 characters.");
      }
    }

    await setDeliveryStatus(id, status, note);
  });
}

export async function claimDelivery(id: string, formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    const profile = await requireApprovedDriverOrAdmin();

    if (!profile || profile.role === "admin") {
      await assignRequest(id, readRequiredText(formData, "driver", "Driver", inputLimits.email));
    } else {
      await claimRequest(id, profile.name);
    }
  });
}

export async function unclaimDelivery(id: string): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireApprovedDriverOrAdmin();
    await unclaimRequest(id);
  });
}

export async function submitDriverApplication(formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    const profile = await requireAuthenticatedRole(["driver"]);

    if (profile?.role === "admin") {
      throw new PublicError("Admin accounts cannot submit driver applications.");
    }

    const email = requiredText(
      profile?.email ?? formData.get("email"),
      "Email",
      inputLimits.email,
    );
    const name = requiredText(
      profile?.name ?? formData.get("name"),
      "Full name",
      inputLimits.name,
    );

    validateEmail(email);

    await createDriverApplication(profile, {
      email,
      name,
      phone: readRequiredText(formData, "phone", "Phone number", inputLimits.phone),
    });
  });
}

export async function resolveDriverApplication(
  driverIdentifier: string,
  decision: DriverApplicationDecision,
): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);

    if (!driverApplicationDecisions.has(decision)) {
      throw new PublicError("Unsupported driver application decision.");
    }

    await resolvePendingDriver(driverIdentifier, decision);
  });
}
