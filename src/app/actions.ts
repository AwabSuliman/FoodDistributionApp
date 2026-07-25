"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedDriverOrAdmin, requireAuthenticatedRole } from "@/lib/authz";
import {
  assignRequest,
  activateSeason,
  claimRequest,
  createDriverApplication,
  createRequest,
  resolvePendingDriver,
  setDeliveryStatus,
  setRequestStatus,
  unclaimRequest,
  updateRequestDetails,
} from "@/lib/data";
import { PublicError, publicErrorMessage } from "@/lib/errors";
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

function readRequiredText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim() === "") {
    throw new PublicError(`${field} is required.`);
  }

  return value.trim();
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PublicError("Enter a valid email address.");
  }
}

export async function submitRequest(formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    const profile = await requireAuthenticatedRole(["recipient"]);
    const householdSize = Number(readRequiredText(formData, "householdSize"));
    const email = readRequiredText(formData, "email");

    if (!Number.isInteger(householdSize) || householdSize < 1) {
      throw new PublicError("Household size must be at least 1.");
    }

    validateEmail(email);

    await createRequest(profile, {
      address: readRequiredText(formData, "address"),
      email,
      householdSize,
      instructions: readRequiredText(formData, "instructions"),
      phone: readRequiredText(formData, "phone"),
      recipient: readRequiredText(formData, "recipient"),
    });
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

export async function editRequest(id: string, formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    await requireAuthenticatedRole(["admin"]);

    const householdSize = Number(readRequiredText(formData, "householdSize"));
    const boxWeightLbs = Number(readRequiredText(formData, "boxWeightLbs"));
    const email = readRequiredText(formData, "email");

    if (!Number.isInteger(householdSize) || householdSize < 1) {
      throw new PublicError("Household size must be at least 1.");
    }
    if (!Number.isInteger(boxWeightLbs) || boxWeightLbs < 1) {
      throw new PublicError("Box weight must be at least 1 lb.");
    }
    validateEmail(email);

    await updateRequestDetails(id, {
      address: readRequiredText(formData, "address"),
      boxWeightLbs,
      email,
      householdSize,
      instructions: readRequiredText(formData, "instructions"),
      phone: readRequiredText(formData, "phone"),
      recipient: readRequiredText(formData, "recipient"),
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
      note = readRequiredText(formData, "reason");

      if (note.length < 5) {
        throw new PublicError("The missed-delivery reason must be at least 5 characters.");
      }
      if (note.length > 500) {
        throw new PublicError("The missed-delivery reason must be 500 characters or fewer.");
      }
    }

    await setDeliveryStatus(id, status, note);
  });
}

export async function claimDelivery(id: string, formData: FormData): Promise<DashboardActionResult> {
  return runDashboardAction(async () => {
    const profile = await requireApprovedDriverOrAdmin();

    if (!profile || profile.role === "admin") {
      await assignRequest(id, readRequiredText(formData, "driver"));
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

    const email = profile?.email ?? readRequiredText(formData, "email");
    const name = profile?.name ?? readRequiredText(formData, "name");

    validateEmail(email);

    await createDriverApplication(profile, {
      email,
      name,
      phone: readRequiredText(formData, "phone"),
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
