"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedDriverOrAdmin, requireAuthenticatedRole } from "@/lib/authz";
import {
  assignRequest,
  claimRequest,
  createDriverApplication,
  createRequest,
  resolvePendingDriver,
  setDeliveryStatus,
  setRequestStatus,
  unclaimRequest,
} from "@/lib/data";
import type { DriverApplicationDecision, RequestStatus } from "@/lib/types";

const editableStatuses = new Set<RequestStatus>(["Under review", "Approved", "Delivered", "Not delivered", "Denied"]);
const deliveryStatuses = new Set<RequestStatus>(["Out for delivery", "Delivered", "Not delivered"]);
const driverApplicationDecisions = new Set<DriverApplicationDecision>(["approved", "denied"]);

function revalidateDashboards() {
  revalidatePath("/");
  revalidatePath("/dashboard");
}

function readRequiredText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
}

export async function submitRequest(formData: FormData) {
  const profile = await requireAuthenticatedRole(["recipient", "driver", "admin"]);

  const householdSize = Number(readRequiredText(formData, "householdSize"));
  const email = readRequiredText(formData, "email");

  if (!Number.isInteger(householdSize) || householdSize < 1) {
    throw new Error("Household size must be at least 1.");
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

  revalidateDashboards();
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  await requireAuthenticatedRole(["admin"]);

  if (!editableStatuses.has(status)) {
    throw new Error("Unsupported request status.");
  }

  await setRequestStatus(id, status);
  revalidateDashboards();
}

export async function updateDeliveryStatus(id: string, status: RequestStatus) {
  await requireApprovedDriverOrAdmin();

  if (!deliveryStatuses.has(status)) {
    throw new Error("Unsupported delivery status.");
  }

  await setDeliveryStatus(id, status);
  revalidateDashboards();
}

export async function claimDelivery(id: string, formData: FormData) {
  const profile = await requireApprovedDriverOrAdmin();

  if (profile?.role === "admin") {
    await assignRequest(id, readRequiredText(formData, "driver"));
  } else {
    await claimRequest(id, profile?.name);
  }
  revalidateDashboards();
}

export async function unclaimDelivery(id: string) {
  await requireApprovedDriverOrAdmin();
  await unclaimRequest(id);
  revalidateDashboards();
}

export async function submitDriverApplication(formData: FormData) {
  const profile = await requireAuthenticatedRole(["recipient", "driver", "admin"]);

  const email = readRequiredText(formData, "email");

  validateEmail(email);

  await createDriverApplication(profile, {
    email,
    name: readRequiredText(formData, "name"),
    phone: readRequiredText(formData, "phone"),
  });

  revalidateDashboards();
}

export async function resolveDriverApplication(email: string, decision: DriverApplicationDecision) {
  await requireAuthenticatedRole(["admin"]);

  if (!driverApplicationDecisions.has(decision)) {
    throw new Error("Unsupported driver application decision.");
  }

  await resolvePendingDriver(email, decision);
  revalidateDashboards();
}
