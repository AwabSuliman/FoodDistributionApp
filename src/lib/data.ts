import "server-only";

import type { AuthProfile } from "./auth";
import { getSupabaseConfig } from "./auth";
import {
  assignDatabaseRequest,
  activateDatabaseSeason,
  claimDatabaseRequest,
  createDatabaseDriverApplication,
  createDatabaseRequest,
  getDatabaseDashboardData,
  resolveDatabaseDriverApplication,
  setDatabaseDeliveryStatus,
  setDatabaseRequestStatus,
  unclaimDatabaseRequest,
  updateDatabaseRequestDetails,
} from "./database";
import {
  claimRequest as claimFileRequest,
  createDriverApplication as createFileDriverApplication,
  createRequest as createFileRequest,
  getDashboardData as getFileDashboardData,
  resolvePendingDriver as resolveFilePendingDriver,
  setRequestStatus as setFileRequestStatus,
  updateRequestDetails as updateFileRequestDetails,
} from "./store";
import type { DriverApplicationDecision, DriverApplicationInput, RequestEditInput, RequestStatus, SeasonInput } from "./types";

type RequestInput = Parameters<typeof createFileRequest>[0];

export async function getDashboardData(profile: AuthProfile | null) {
  if (getSupabaseConfig() && profile) return getDatabaseDashboardData(profile);
  return getFileDashboardData();
}

export async function createRequest(profile: AuthProfile | null, input: RequestInput) {
  if (getSupabaseConfig()) {
    if (!profile) throw new Error("You must be signed in to submit a request.");
    return createDatabaseRequest(profile, input);
  }
  return createFileRequest(input);
}

export async function setRequestStatus(id: string, status: RequestStatus) {
  if (getSupabaseConfig()) return setDatabaseRequestStatus(id, status);
  return setFileRequestStatus(id, status);
}

export async function updateRequestDetails(id: string, input: RequestEditInput) {
  if (getSupabaseConfig()) return updateDatabaseRequestDetails(id, input);
  return updateFileRequestDetails(id, input);
}

export async function activateSeason(input: SeasonInput) {
  if (!getSupabaseConfig()) throw new Error("Connect Supabase before managing distribution seasons.");
  return activateDatabaseSeason(input);
}

export async function claimRequest(id: string, driver?: string) {
  if (getSupabaseConfig()) return claimDatabaseRequest(id);
  return claimFileRequest(id, driver);
}

export async function assignRequest(id: string, driverId: string) {
  if (getSupabaseConfig()) return assignDatabaseRequest(id, driverId);
  return claimFileRequest(id, driverId);
}

export async function unclaimRequest(id: string) {
  if (getSupabaseConfig()) return unclaimDatabaseRequest(id);
  return setFileRequestStatus(id, "Approved");
}

export async function setDeliveryStatus(id: string, status: RequestStatus) {
  if (getSupabaseConfig()) return setDatabaseDeliveryStatus(id, status);
  return setFileRequestStatus(id, status);
}

export async function createDriverApplication(profile: AuthProfile | null, input: DriverApplicationInput) {
  if (getSupabaseConfig()) {
    if (!profile) throw new Error("You must be signed in to apply as a driver.");
    return createDatabaseDriverApplication(profile, input);
  }
  return createFileDriverApplication(input);
}

export async function resolvePendingDriver(email: string, decision: DriverApplicationDecision) {
  if (getSupabaseConfig()) return resolveDatabaseDriverApplication(email, decision);
  return resolveFilePendingDriver(email, decision);
}
