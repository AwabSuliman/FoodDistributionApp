"use client";

import { useMemo, useState } from "react";
import {
  bulkAssignDeliveries,
  bulkApproveDriverApplications,
  bulkUpdateRequests,
  claimDelivery,
  createSeason,
  editOwnRequest,
  editRequest,
  markEveryNotificationAsRead,
  markNotificationAsRead,
  resolveDriverApplication,
  submitDriverApplication,
  submitRequest,
  unclaimDelivery,
  updateDeliveryStatus,
  updateRequestIntake,
  updateRequestStatus,
} from "./actions";
import type { DashboardActionResult } from "./actions";
import { signOut } from "./login/actions";
import type { AuthProfile } from "@/lib/auth";
import { driverApplicationIdentifier } from "@/lib/driver-applications";
import { getAvailableDriversForProfile, getDriverRequestBuckets } from "@/lib/driver-requests";
import {
  requestCsvFilename,
  requestsToCsv,
  routeManifestFilename,
  routeManifestToCsv,
} from "@/lib/request-csv";
import { inputLimits } from "@/lib/input-limits";
import { getBulkRequestOperation, isBulkSelectable } from "@/lib/request-bulk";
import { makeRequestReport } from "@/lib/request-report";
import {
  canEditRequest,
  canRecipientEditRequest,
  canSubmitRecipientRequest,
  requestAssignmentAction,
} from "@/lib/request-access";
import { groupRequestsBySeason } from "@/lib/request-history";
import { getRequestProgressIndex, requestProgressOrder } from "@/lib/request-progress";
import { seasonDateRange } from "@/lib/season-input";
import { LiveDashboardRefresh } from "./live-dashboard-refresh";
import type {
  AppNotification,
  DashboardData,
  DeliveryActivity,
  DistributionRequest,
  DriverApplicationStatus,
  RequestStatus,
  Role,
} from "@/lib/types";

const roleOptions: { role: Role; label: string; helper: string }[] = [
  { role: "recipient", label: "Recipient", helper: "Submit and track a request" },
  { role: "admin", label: "Admin", helper: "Review requests and drivers" },
  { role: "driver", label: "Driver", helper: "Claim available deliveries" },
];

const statusTone: Record<RequestStatus, string> = {
  Submitted: "border-slate-200 bg-slate-50 text-slate-700",
  "Under review": "border-amber-200 bg-amber-50 text-amber-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Driver assigned": "border-sky-200 bg-sky-50 text-sky-800",
  "Heading to pickup": "border-cyan-200 bg-cyan-50 text-cyan-800",
  "Picked up": "border-indigo-200 bg-indigo-50 text-indigo-800",
  "Out for delivery": "border-violet-200 bg-violet-50 text-violet-800",
  Delivered: "border-teal-200 bg-teal-50 text-teal-800",
  "Not delivered": "border-rose-200 bg-rose-50 text-rose-800",
  Denied: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const statusOptions: (RequestStatus | "All")[] = [
  "All",
  "Submitted",
  "Under review",
  "Approved",
  "Driver assigned",
  "Heading to pickup",
  "Picked up",
  "Out for delivery",
  "Delivered",
  "Not delivered",
  "Denied",
];

function requestIdentifier(request: DistributionRequest) {
  return request.recordId ?? request.id;
}

function downloadCsv(contents: string, filename: string) {
  const blob = new Blob(["\uFEFF", contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function Dashboard({ auth, data }: { auth: AuthProfile | null; data: DashboardData }) {
  const visibleRoleOptions =
    auth?.role === "admin" || !auth ? roleOptions : roleOptions.filter((option) => option.role === auth.role);
  const [activeRole, setActiveRole] = useState<Role>(visibleRoleOptions[0]?.role ?? "recipient");
  const { familySizeRows, pendingDrivers, requests } = data;
  const stats = useMemo(
    () => ({
      review: requests.filter((request) => ["Submitted", "Under review"].includes(request.status)).length,
      available: requests.filter((request) => request.status === "Approved").length,
      assigned: requests.filter((request) => ["Driver assigned", "Heading to pickup", "Picked up"].includes(request.status)).length,
      enRoute: requests.filter((request) => request.status === "Out for delivery").length,
      repeat: requests.filter((request) => request.status === "Not delivered").length,
      delivered: requests.filter((request) => request.status === "Delivered").length,
    }),
    [requests],
  );

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#17201f]">
      <LiveDashboardRefresh enabled={Boolean(auth)} />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="border-b border-[#d8ded7] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold tracking-wide text-[#53645f]">Masjid Al-Wasatiyah Wal-Itidaal</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111817] sm:text-3xl">
                Zakatul Fitr Distribution
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#53645f]">
                {auth ? `${auth.name} · ${auth.email} · ${auth.role}` : "Demo mode: configure Supabase to require sign-in"}
              </p>
            </div>
            <div className="grid gap-3">
              <nav
                className="grid rounded-lg border border-[#d7ded7] bg-white p-1 shadow-sm sm:grid-cols-3"
                aria-label="Role dashboards"
              >
                {visibleRoleOptions.map((option) => (
                  <button
                    className={`rounded-md px-4 py-3 text-left transition ${
                      activeRole === option.role
                        ? "bg-[#1f5d54] text-white shadow-sm"
                        : "text-[#293532] hover:bg-[#f0f3ef]"
                    }`}
                    key={option.role}
                    onClick={() => setActiveRole(option.role)}
                    type="button"
                  >
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        activeRole === option.role ? "text-white/80" : "text-[#66736f]"
                      }`}
                    >
                      {option.helper}
                    </span>
                  </button>
                ))}
              </nav>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <NotificationCenter notifications={data.notifications} />
                {auth && (
                  <form action={signOut}>
                    <button className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold text-[#26312f]">
                      Sign out
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-5">
            {activeRole === "recipient" && (
              <RecipientView
                acceptingRequests={!auth || Boolean(data.activeSeason?.acceptingRequests)}
                auth={auth}
                requests={requests}
              />
            )}
            {activeRole === "admin" && (
              <AdminView
                approvedDrivers={data.approvedDrivers}
                activeSeason={data.activeSeason}
                canManageSeasons={Boolean(auth)}
                deniedDrivers={data.deniedDrivers}
                familySizeRows={familySizeRows}
                pendingDrivers={pendingDrivers}
                requestHistory={data.requestHistory ?? []}
                requests={requests}
                stats={stats}
              />
            )}
            {activeRole === "driver" && (
              <DriverView
                approvedDrivers={data.approvedDrivers}
                auth={auth}
                currentApplication={data.currentDriverApplication}
                pendingDrivers={pendingDrivers}
                requests={requests}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function NotificationCenter({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const [optimisticallyRead, setOptimisticallyRead] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const items = notifications.map((notification) =>
    optimisticallyRead.has(notification.id) ? { ...notification, read: true } : notification,
  );
  const unreadCount = items.filter((notification) => !notification.read).length;

  async function markOne(id: string) {
    setPendingId(id);
    setMessage("");
    const result = await markNotificationAsRead(id);

    if (result.ok) {
      setOptimisticallyRead((current) => new Set(current).add(id));
    } else {
      setMessage(result.error);
    }

    setPendingId(null);
  }

  async function markAll() {
    setPendingId("all");
    setMessage("");
    const result = await markEveryNotificationAsRead();

    if (result.ok) {
      setOptimisticallyRead(new Set(notifications.map((notification) => notification.id)));
    } else {
      setMessage(result.error);
    }

    setPendingId(null);
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold text-[#26312f]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="inline-flex min-w-5 justify-center rounded-full bg-[#1f5d54] px-1.5 py-0.5 text-xs text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[#c9d3ce] bg-white text-left shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-[#e3e8e4] px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#66736f]">Updates</p>
              <h2 className="mt-0.5 text-base font-bold text-[#111817]">Notifications</h2>
            </div>
            {unreadCount > 0 && (
              <button
                className="text-sm font-bold text-[#1f5d54] disabled:text-[#89938f]"
                disabled={pendingId !== null}
                onClick={markAll}
                type="button"
              >
                {pendingId === "all" ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm font-semibold text-[#66736f]">No notifications yet.</p>
            ) : (
              items.map((notification) => (
                <article
                  className={`border-b border-[#edf0ed] px-4 py-3 last:border-b-0 ${
                    notification.read ? "bg-white" : "bg-[#f1f7f4]"
                  }`}
                  key={notification.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#1f5d54]" aria-label="Unread" />
                        )}
                        <h3 className="text-sm font-bold text-[#17201f]">{notification.title}</h3>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#53645f]">{notification.message}</p>
                      <p className="mt-2 text-xs font-semibold text-[#7a8581]">{notification.occurred}</p>
                    </div>
                    {!notification.read && (
                      <button
                        className="shrink-0 text-xs font-bold text-[#1f5d54] disabled:text-[#89938f]"
                        disabled={pendingId !== null}
                        onClick={() => markOne(notification.id)}
                        type="button"
                      >
                        {pendingId === notification.id ? "Marking..." : "Mark read"}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
          {message && (
            <p aria-live="polite" className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800">
              {message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function RecipientView({
  acceptingRequests,
  auth,
  requests,
}: {
  acceptingRequests: boolean;
  auth: AuthProfile | null;
  requests: DistributionRequest[];
}) {
  const latestRequest = requests[0];
  const canSubmit = canSubmitRecipientRequest(auth?.role, Boolean(latestRequest), acceptingRequests);
  const canEditOwnRequest = latestRequest
    ? canRecipientEditRequest(auth?.role, latestRequest.status)
    : false;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel
        title={canSubmit ? "Request a food box" : "Your food box request"}
        kicker="Recipient"
        action={<span className="text-sm font-semibold text-[#66736f]">One request per family</span>}
      >
        {canSubmit ? (
          <>
            <div className="mb-5 rounded-md border border-[#e6d8b8] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#76521d]">
              Each family can submit one request. If a delivery attempt fails, please contact the driver.
            </div>
            <ActionForm action={submitRequest} className="grid gap-4" successMessage="Request submitted.">
              <Field label="Full name" maxLength={inputLimits.name} name="recipient" value={auth?.name ?? "Fatima Ahmed"} />
              <Field label="Address" maxLength={inputLimits.address} name="address" value={auth ? "" : "216 Garden View Rd, Springfield, VA"} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Telephone/cellphone" maxLength={inputLimits.phone} name="phone" value={auth ? "" : "(555) 017-6641"} />
                <Field label="Email" maxLength={inputLimits.email} name="email" type="email" value={auth?.email ?? "fatima@example.com"} />
              </div>
              <Field label="Household members" name="householdSize" type="number" value="6" />
              <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
                Delivery instructions
                <textarea
                  className="min-h-28 rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                  defaultValue={auth ? "" : "Call when outside. Apartment is on the second floor."}
                  maxLength={inputLimits.instructions}
                  name="instructions"
                  required
                />
              </label>
              <SubmitButton label="Submit request" />
            </ActionForm>
          </>
        ) : latestRequest ? (
          <>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="font-bold">Your request has already been submitted.</p>
              <p className="mt-2 text-sm leading-6">
                Follow {latestRequest?.id} in the status panel.{" "}
                {canEditOwnRequest
                  ? "You can correct the details below while the mosque reviews it."
                  : "Contact the mosque if any household or delivery details need to be corrected."}
              </p>
            </div>
            {canEditOwnRequest && latestRequest && (
              <div className="mt-5 border-t border-[#dfe5e1] pt-5">
                <h3 className="font-bold text-[#26312f]">Update request details</h3>
                <ActionForm
                  action={editOwnRequest.bind(null, latestRequest.recordId ?? latestRequest.id)}
                  className="mt-4 grid gap-4"
                  successMessage="Request details updated."
                >
                  <Field label="Full name" maxLength={inputLimits.name} name="recipient" value={latestRequest.recipient} />
                  <Field label="Address" maxLength={inputLimits.address} name="address" value={latestRequest.address} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Telephone/cellphone" maxLength={inputLimits.phone} name="phone" value={latestRequest.phone} />
                    <Field label="Email" maxLength={inputLimits.email} name="email" type="email" value={latestRequest.email} />
                  </div>
                  <Field
                    label="Household members"
                    name="householdSize"
                    type="number"
                    value={String(latestRequest.householdSize)}
                  />
                  <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
                    Delivery instructions
                    <textarea
                      className="min-h-28 rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                      defaultValue={latestRequest.instructions}
                      maxLength={inputLimits.instructions}
                      name="instructions"
                      required
                    />
                  </label>
                  <SubmitButton label="Save changes" />
                </ActionForm>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-bold">Food box requests are currently closed.</p>
            <p className="mt-2 text-sm leading-6">
              The mosque will reopen this form when it is ready to accept requests for the active season.
            </p>
          </div>
        )}
      </Panel>

      <Panel
        title="Request status"
        kicker="Progress"
        action={latestRequest ? <StatusPill status={latestRequest.status} /> : undefined}
      >
        <RequestTimeline request={latestRequest} />
      </Panel>
    </section>
  );
}

function AdminView({
  activeSeason,
  approvedDrivers,
  canManageSeasons,
  deniedDrivers,
  familySizeRows,
  pendingDrivers,
  requestHistory,
  requests,
  stats,
}: {
  activeSeason: DashboardData["activeSeason"];
  approvedDrivers: DashboardData["approvedDrivers"];
  canManageSeasons: boolean;
  deniedDrivers: DashboardData["deniedDrivers"];
  familySizeRows: DashboardData["familySizeRows"];
  pendingDrivers: DashboardData["pendingDrivers"];
  requestHistory: DistributionRequest[];
  requests: DistributionRequest[];
  stats: { review: number; available: number; assigned: number; enRoute: number; repeat: number; delivered: number };
}) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "All">("All");
  const [query, setQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedHistorySeasonId, setSelectedHistorySeasonId] = useState("");
  const [selectedHistoryRequestId, setSelectedHistoryRequestId] = useState("");
  const [driverRosterStatus, setDriverRosterStatus] = useState<DriverApplicationStatus>("pending");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus = statusFilter === "All" || request.status === statusFilter;
      const matchesQuery =
        normalizedQuery === "" ||
        [request.id, request.recipient, request.email, request.phone, request.address, request.driver ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesStatus && matchesQuery;
    });
  }, [query, requests, statusFilter]);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const selectableFilteredRequests = filteredRequests.filter((request) => isBulkSelectable(request.status));
  const selectedRequests = requests.filter((request) =>
    selectedRequestIds.includes(requestIdentifier(request)),
  );
  const bulkOperation = getBulkRequestOperation(selectedRequests);
  const allFilteredSelected =
    selectableFilteredRequests.length > 0
    && selectableFilteredRequests.every((request) =>
      selectedRequestIds.includes(requestIdentifier(request)),
    );
  const selectedRequestCanBeEdited = selectedRequest ? canEditRequest(selectedRequest.status) : false;
  const selectedRequestAssignmentAction = selectedRequest ? requestAssignmentAction(selectedRequest.status) : null;
  const historyGroups = useMemo(() => groupRequestsBySeason(requestHistory), [requestHistory]);
  const selectedHistoryGroup =
    historyGroups.find((group) => group.id === selectedHistorySeasonId) ?? historyGroups[0];
  const selectedHistoryRequest = selectedHistoryGroup?.requests.find(
    (request) => request.id === selectedHistoryRequestId,
  );
  const driverRoster = {
    approved: approvedDrivers,
    denied: deniedDrivers,
    pending: pendingDrivers,
  }[driverRosterStatus];
  const requestReport = useMemo(() => makeRequestReport(requests), [requests]);

  function exportRequests() {
    downloadCsv(requestsToCsv(filteredRequests), requestCsvFilename(activeSeason?.name));
  }

  function exportHistory() {
    if (!selectedHistoryGroup) return;

    downloadCsv(
      requestsToCsv(selectedHistoryGroup.requests),
      requestCsvFilename(selectedHistoryGroup.name),
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Needs review" value={stats.review} tone="border-amber-200 bg-amber-50 text-amber-900" />
        <Stat label="Available" value={stats.available} tone="border-emerald-200 bg-emerald-50 text-emerald-900" />
        <Stat label="Assigned" value={stats.assigned} tone="border-sky-200 bg-sky-50 text-sky-900" />
        <Stat label="En route" value={stats.enRoute} tone="border-violet-200 bg-violet-50 text-violet-900" />
        <Stat label="Repeat" value={stats.repeat} tone="border-rose-200 bg-rose-50 text-rose-900" />
        <Stat label="Delivered" value={stats.delivered} tone="border-teal-200 bg-teal-50 text-teal-900" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Requests"
          kicker="Admin dashboard"
          action={
            <button
              className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold text-[#26312f] disabled:cursor-not-allowed disabled:text-[#8b9894]"
              disabled={filteredRequests.length === 0}
              onClick={exportRequests}
              type="button"
            >
              Export CSV
            </button>
          }
        >
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
              Search
              <input
                className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, request, phone, address"
                type="search"
                value={query}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
              Status
              <select
                className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                onChange={(event) => setStatusFilter(event.target.value as RequestStatus | "All")}
                value={statusFilter}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedRequestIds.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 border-y border-[#dfe5e1] bg-[#f8faf8] px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-[#26312f]">
                  {selectedRequestIds.length} request{selectedRequestIds.length === 1 ? "" : "s"} selected
                </p>
                <button
                  className="text-sm font-bold text-[#53645f]"
                  onClick={() => setSelectedRequestIds([])}
                  type="button"
                >
                  Clear selection
                </button>
              </div>
              {bulkOperation === "review" && (
                <ActionForm
                  action={bulkUpdateRequests.bind(null, "Under review")}
                  className="flex flex-wrap items-center gap-2"
                  onSuccess={() => setSelectedRequestIds([])}
                  successMessage="Selected requests moved to review."
                >
                  <SelectedRequestFields ids={selectedRequestIds} />
                  <button className="rounded-md bg-[#1f5d54] px-3 py-2 text-sm font-bold text-white" type="submit">
                    Start review
                  </button>
                </ActionForm>
              )}
              {bulkOperation === "approve" && (
                <ActionForm
                  action={bulkUpdateRequests.bind(null, "Approved")}
                  className="flex flex-wrap items-center gap-2"
                  onSuccess={() => setSelectedRequestIds([])}
                  successMessage="Selected requests approved."
                >
                  <SelectedRequestFields ids={selectedRequestIds} />
                  <button className="rounded-md bg-[#1f5d54] px-3 py-2 text-sm font-bold text-white" type="submit">
                    Approve selected
                  </button>
                </ActionForm>
              )}
              {bulkOperation === "assign" && (
                <ActionForm
                  action={bulkAssignDeliveries}
                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  onSuccess={() => setSelectedRequestIds([])}
                  successMessage="Selected deliveries assigned."
                >
                  <SelectedRequestFields ids={selectedRequestIds} />
                  <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
                    Approved driver
                    <select
                      className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal"
                      disabled={approvedDrivers.length === 0}
                      name="driver"
                      required
                    >
                      {approvedDrivers.map((driver) => (
                        <option
                          key={driverApplicationIdentifier(driver)}
                          value={driverApplicationIdentifier(driver)}
                        >
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="rounded-md bg-[#1f5d54] px-3 py-2 text-sm font-bold text-white disabled:bg-[#9aaaa5]"
                    disabled={approvedDrivers.length === 0}
                    type="submit"
                  >
                    Assign selected
                  </button>
                </ActionForm>
              )}
              {!bulkOperation && (
                <p className="text-sm font-semibold text-amber-900">
                  Select requests at the same stage to use a bulk action.
                </p>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dfe5e1] text-xs uppercase tracking-wide text-[#66736f]">
                  <th className="px-3 py-3">
                    <input
                      aria-label="Select all actionable requests"
                      checked={allFilteredSelected}
                      className="h-4 w-4 accent-[#1f5d54]"
                      onChange={(event) => {
                        const filteredIds = selectableFilteredRequests.map(requestIdentifier);
                        setSelectedRequestIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, ...filteredIds])]
                            : current.filter((id) => !filteredIds.includes(id)),
                        );
                      }}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3 py-3">Request</th>
                  <th className="px-3 py-3">Family</th>
                  <th className="px-3 py-3">Box</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Driver</th>
                  <th className="px-3 py-3">Updated</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ed]">
                {filteredRequests.map((request) => (
                  <tr className="bg-white hover:bg-[#f8faf8]" key={request.id}>
                    <td className="px-3 py-3">
                      <input
                        aria-label={`Select ${request.id}`}
                        checked={selectedRequestIds.includes(requestIdentifier(request))}
                        className="h-4 w-4 accent-[#1f5d54]"
                        disabled={!isBulkSelectable(request.status)}
                        onChange={(event) =>
                          setSelectedRequestIds((current) => {
                            const id = requestIdentifier(request);
                            return event.target.checked
                              ? [...current, id]
                              : current.filter((item) => item !== id);
                          })
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-[#17201f]">{request.id}</p>
                      <p className="text-[#66736f]">{request.recipient}</p>
                    </td>
                    <td className="px-3 py-3">{request.householdSize}</td>
                    <td className="px-3 py-3 font-semibold">{request.boxWeight}</td>
                    <td className="px-3 py-3">
                      <StatusPill status={request.status} />
                    </td>
                    <td className="px-3 py-3">{request.driver ?? "Unassigned"}</td>
                    <td className="px-3 py-3 text-[#66736f]">{request.updated}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {request.status === "Submitted" && (
                          <ActionButton action={updateRequestStatus.bind(null, request.recordId ?? request.id, "Under review")} label="Review" primary />
                        )}
                        {request.status === "Under review" && (
                          <>
                            <ActionButton action={updateRequestStatus.bind(null, request.recordId ?? request.id, "Approved")} label="Approve" primary />
                            <ActionButton action={updateRequestStatus.bind(null, request.recordId ?? request.id, "Denied")} label="Deny" />
                          </>
                        )}
                        <button
                          className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-xs font-bold text-[#26312f]"
                          onClick={() => setSelectedRequestId(request.id)}
                          type="button"
                        >
                          {canEditRequest(request.status)
                            ? "Edit"
                            : requestAssignmentAction(request.status)
                              ? "Manage"
                              : "View"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRequests.length === 0 && (
              <p className="border-t border-[#edf0ed] px-3 py-5 text-sm font-semibold text-[#53645f]">
                No requests match the current filters.
              </p>
            )}
          </div>
          {selectedRequest && (
            <div className="mt-5 border-t border-[#dfe5e1] pt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#66736f]">
                    {selectedRequestCanBeEdited ? "Edit before approval" : "Request details"}
                  </p>
                  <h3 className="mt-1 font-bold">{selectedRequest.id}</h3>
                </div>
                <button
                  className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold"
                  onClick={() => setSelectedRequestId("")}
                  type="button"
                >
                  Close
                </button>
              </div>
              {selectedRequestCanBeEdited ? (
                <ActionForm
                  action={editRequest.bind(null, selectedRequest.recordId ?? selectedRequest.id)}
                  className="grid gap-3 md:grid-cols-2"
                  successMessage="Request updated."
                >
                  <Field label="Full name" maxLength={inputLimits.name} name="recipient" value={selectedRequest.recipient} />
                  <Field label="Email" maxLength={inputLimits.email} name="email" type="email" value={selectedRequest.email} />
                  <Field label="Telephone/cellphone" maxLength={inputLimits.phone} name="phone" value={selectedRequest.phone} />
                  <Field label="Address" maxLength={inputLimits.address} name="address" value={selectedRequest.address} />
                  <Field
                    label="Household members"
                    name="householdSize"
                    type="number"
                    value={String(selectedRequest.householdSize)}
                  />
                  <Field
                    label="Box weight (lb)"
                    name="boxWeightLbs"
                    type="number"
                    value={selectedRequest.boxWeight.replace(/\D/g, "")}
                  />
                  <label className="grid gap-1.5 text-sm font-semibold text-[#26312f] md:col-span-2">
                    Delivery instructions
                    <textarea
                      className="min-h-24 rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal"
                      defaultValue={selectedRequest.instructions}
                      maxLength={inputLimits.instructions}
                      name="instructions"
                      required
                    />
                  </label>
                  <div className="md:col-span-2">
                    <SubmitButton label="Save request" />
                  </div>
                </ActionForm>
              ) : (
                <RequestDetails request={selectedRequest} />
              )}
              {selectedRequestAssignmentAction === "assign" && (
                <div className="mt-5 border-t border-[#dfe5e1] pt-5">
                  <h4 className="font-bold text-[#26312f]">Driver assignment</h4>
                  <p className="mt-1 text-sm leading-6 text-[#66736f]">
                    Assign this request to an approved volunteer driver.
                  </p>
                  {approvedDrivers.length === 0 ? (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                      Approve a driver application before assigning this request.
                    </p>
                  ) : (
                    <ActionForm
                      action={claimDelivery.bind(null, selectedRequest.recordId ?? selectedRequest.id)}
                      className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                      successMessage="Driver assigned."
                    >
                      <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
                        Approved driver
                        <select
                          className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                          name="driver"
                          required
                        >
                          {approvedDrivers.map((driver) => (
                            <option
                              key={driverApplicationIdentifier(driver)}
                              value={driverApplicationIdentifier(driver)}
                            >
                              {driver.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <SubmitButton label="Assign driver" />
                    </ActionForm>
                  )}
                </div>
              )}
              {selectedRequestAssignmentAction === "unassign" && (
                <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#dfe5e1] pt-5 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="font-bold text-[#26312f]">Driver assignment</h4>
                    <p className="mt-1 text-sm text-[#66736f]">
                      Currently assigned to {selectedRequest.driver ?? "an approved driver"}.
                    </p>
                  </div>
                  <ActionButton
                    action={unclaimDelivery.bind(null, selectedRequest.recordId ?? selectedRequest.id)}
                    label="Unassign"
                  />
                </div>
              )}
              <DeliveryActivityList activities={selectedRequest.deliveryActivity ?? []} showEmpty />
            </div>
          )}
        </Panel>

        <div className="grid gap-5">
          <Panel title={activeSeason?.name ?? "No active season"} kicker="Distribution season">
            {canManageSeasons ? (
              <div className="grid gap-4">
                {activeSeason && (
                  <div className="grid gap-3 border-b border-[#dfe5e1] pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-[#66736f]">Currently active</p>
                      <p className="mt-1 text-sm font-semibold text-[#26312f]">{seasonDateRange(activeSeason)}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-bold ${
                          activeSeason.acceptingRequests
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        Requests {activeSeason.acceptingRequests ? "open" : "closed"}
                      </span>
                      <ActionButton
                        action={updateRequestIntake.bind(null, !activeSeason.acceptingRequests)}
                        label={activeSeason.acceptingRequests ? "Close requests" : "Open requests"}
                      />
                    </div>
                  </div>
                )}
                <ActionForm action={createSeason} className="grid gap-3" successMessage="New season activated.">
                  <Field label="New season name" maxLength={inputLimits.seasonName} name="name" value="Ramadan 2027" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Starts" name="startsOn" type="date" value="2027-02-08" />
                    <Field label="Ends" name="endsOn" type="date" value="2027-03-09" />
                  </div>
                  <label className="flex items-start gap-2 text-sm font-semibold leading-5 text-[#53645f]">
                    <input
                      className="mt-1 h-4 w-4 accent-[#1f5d54]"
                      name="confirmActivation"
                      required
                      type="checkbox"
                      value="yes"
                    />
                    <span>Archive the current season and make this one active.</span>
                  </label>
                  <SubmitButton label="Activate season" />
                </ActionForm>
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#53645f]">Connect Supabase to manage seasons.</p>
            )}
          </Panel>
          <Panel title="Driver roster" kicker="Volunteers">
            <div className="grid gap-3">
              <div className="grid grid-cols-3 rounded-md border border-[#d7ded7] bg-[#f8faf8] p-1">
                {(["pending", "approved", "denied"] as DriverApplicationStatus[]).map((status) => {
                  const count = {
                    approved: approvedDrivers.length,
                    denied: deniedDrivers.length,
                    pending: pendingDrivers.length,
                  }[status];

                  return (
                    <button
                      className={`rounded px-2 py-2 text-xs font-bold capitalize ${
                        driverRosterStatus === status ? "bg-[#1f5d54] text-white" : "text-[#53645f]"
                      }`}
                      key={status}
                      onClick={() => setDriverRosterStatus(status)}
                      type="button"
                    >
                      {status} ({count})
                    </button>
                  );
                })}
              </div>
              {driverRosterStatus === "pending" && pendingDrivers.length > 0 && (
                <div className="grid gap-3 border-y border-[#dfe5e1] bg-[#f8faf8] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-[#26312f]">
                      <input
                        checked={
                          pendingDrivers.length > 0
                          && pendingDrivers.every((driver) =>
                            selectedDriverIds.includes(driverApplicationIdentifier(driver)),
                          )
                        }
                        className="h-4 w-4 accent-[#1f5d54]"
                        onChange={(event) =>
                          setSelectedDriverIds(
                            event.target.checked
                              ? pendingDrivers.map(driverApplicationIdentifier)
                              : [],
                          )
                        }
                        type="checkbox"
                      />
                      Select all pending
                    </label>
                    {selectedDriverIds.length > 0 && (
                      <button
                        className="text-sm font-bold text-[#53645f]"
                        onClick={() => setSelectedDriverIds([])}
                        type="button"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {selectedDriverIds.length > 0 && (
                    <ActionForm
                      action={bulkApproveDriverApplications}
                      className="flex flex-wrap items-center gap-2"
                      onSuccess={() => setSelectedDriverIds([])}
                      successMessage="Selected driver applications approved."
                    >
                      {selectedDriverIds.map((id) => (
                        <input key={id} name="driverId" type="hidden" value={id} />
                      ))}
                      <button
                        className="rounded-md bg-[#1f5d54] px-3 py-2 text-sm font-bold text-white"
                        type="submit"
                      >
                        Approve {selectedDriverIds.length} selected
                      </button>
                    </ActionForm>
                  )}
                </div>
              )}
              {driverRoster.length === 0 ? (
                <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
                  No {driverRosterStatus} driver applications.
                </p>
              ) : (
                driverRoster.map((driver) => (
                  <div className="rounded-md border border-[#dfe5e1] bg-white p-3" key={driver.email}>
                    <div className="flex items-start gap-3">
                      {driverRosterStatus === "pending" && (
                        <input
                          aria-label={`Select ${driver.name}`}
                          checked={selectedDriverIds.includes(driverApplicationIdentifier(driver))}
                          className="mt-1 h-4 w-4 accent-[#1f5d54]"
                          onChange={(event) => {
                            const id = driverApplicationIdentifier(driver);
                            setSelectedDriverIds((current) =>
                              event.target.checked
                                ? [...current, id]
                                : current.filter((item) => item !== id),
                            );
                          }}
                          type="checkbox"
                        />
                      )}
                      <p className="font-bold">{driver.name}</p>
                    </div>
                    <a className="mt-1 block text-sm text-[#1f5d54]" href={`tel:${driver.phone}`}>
                      {driver.phone}
                    </a>
                    <a className="block break-all text-sm text-[#1f5d54]" href={`mailto:${driver.email}`}>
                      {driver.email}
                    </a>
                    {driverRosterStatus === "pending" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <ActionButton
                          action={resolveDriverApplication.bind(null, driverApplicationIdentifier(driver), "approved")}
                          label="Approve"
                          primary
                        />
                        <ActionButton
                          action={resolveDriverApplication.bind(null, driverApplicationIdentifier(driver), "denied")}
                          label="Deny"
                        />
                      </div>
                    )}
                    {driverRosterStatus === "denied" && (
                      <p className="mt-3 text-xs font-semibold text-[#66736f]">May submit a new application.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Family size" kicker="Report">
            <div className="overflow-hidden rounded-md border border-[#dfe5e1] bg-white">
              {familySizeRows.map((row) => (
                <div className="grid grid-cols-4 border-b border-[#edf0ed] px-3 py-2 text-sm last:border-0" key={row.size}>
                  <span className="font-bold">{row.size}</span>
                  <span>{row.approved} app.</span>
                  <span>{row.denied} den.</span>
                  <span>{row.delivered} del.</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Distribution totals" kicker="Planning">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <ReportMetric label="Families" value={requestReport.families} />
              <ReportMetric label="People" value={requestReport.householdMembers} />
              <ReportMetric label="Approved food" value={`${requestReport.approvedWeightLbs} lb`} />
              <ReportMetric label="Delivered food" value={`${requestReport.deliveredWeightLbs} lb`} />
            </div>
            <div className="mt-4 overflow-x-auto border-t border-[#dfe5e1] pt-3">
              <table className="w-full min-w-[280px] text-left text-xs">
                <thead className="text-[#66736f]">
                  <tr>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2">Families</th>
                    <th className="py-1 pr-2">People</th>
                    <th className="py-1">Food</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ed]">
                  {requestReport.statusRows.map((row) => (
                    <tr key={row.status}>
                      <td className="py-2 pr-2 font-semibold">{row.status}</td>
                      <td className="py-2 pr-2">{row.families}</td>
                      <td className="py-2 pr-2">{row.householdMembers}</td>
                      <td className="py-2">{row.weightLbs} lb</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Past seasons"
            kicker="History"
            action={
              selectedHistoryGroup ? (
                <button
                  className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold text-[#26312f]"
                  onClick={exportHistory}
                  type="button"
                >
                  Export season
                </button>
              ) : undefined
            }
          >
            {historyGroups.length === 0 ? (
              <p className="text-sm font-semibold text-[#53645f]">No archived requests yet.</p>
            ) : (
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
                  Distribution season
                  <select
                    className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                    onChange={(event) => {
                      setSelectedHistorySeasonId(event.target.value);
                      setSelectedHistoryRequestId("");
                    }}
                    value={selectedHistoryGroup?.id ?? ""}
                  >
                    {historyGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.requests.length})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#dfe5e1] text-xs uppercase text-[#66736f]">
                        <th className="py-2 pr-3">Request</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Driver</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf0ed]">
                      {selectedHistoryGroup?.requests.map((request) => (
                        <tr key={request.recordId ?? request.id}>
                          <td className="py-2 pr-3">
                            <span className="font-bold">{request.id}</span>
                            <span className="block text-[#66736f]">{request.recipient}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <StatusPill status={request.status} />
                          </td>
                          <td className="py-2 pr-3">{request.driver ?? "Unassigned"}</td>
                          <td className="py-2">
                            <button
                              className="rounded-md border border-[#c9d3ce] bg-white px-2 py-1.5 text-xs font-bold"
                              onClick={() => setSelectedHistoryRequestId(request.id)}
                              type="button"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedHistoryRequest && (
                  <div className="border-t border-[#dfe5e1] pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase text-[#66736f]">Archived request</p>
                        <h3 className="mt-1 font-bold">{selectedHistoryRequest.id}</h3>
                      </div>
                      <button
                        className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold"
                        onClick={() => setSelectedHistoryRequestId("")}
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                    <RequestDetails request={selectedHistoryRequest} />
                    <DeliveryActivityList activities={selectedHistoryRequest.deliveryActivity ?? []} showEmpty />
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function DriverView({
  approvedDrivers,
  auth,
  currentApplication,
  pendingDrivers,
  requests,
}: {
  approvedDrivers: DashboardData["approvedDrivers"];
  auth: AuthProfile | null;
  currentApplication: DashboardData["currentDriverApplication"];
  pendingDrivers: DashboardData["pendingDrivers"];
  requests: DistributionRequest[];
}) {
  const availableDrivers = getAvailableDriversForProfile(approvedDrivers, auth);
  const canChooseDriver = auth?.role === "admin" || !auth;
  const [selectedDriver, setSelectedDriver] = useState(availableDrivers[0]?.userId ?? availableDrivers[0]?.name ?? "");
  const activeDriver =
    availableDrivers.find((driver) => (driver.userId ?? driver.name) === selectedDriver) ?? availableDrivers[0];
  const { assigned, available, completed } = getDriverRequestBuckets(requests, activeDriver?.name);
  const deliveredCount = completed.filter((request) => request.status === "Delivered").length;
  const missedCount = completed.filter((request) => request.status === "Not delivered").length;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid grid-cols-3 gap-3 xl:col-span-2">
        <Stat label="Active" value={assigned.length} tone="border-sky-200 bg-sky-50 text-sky-900" />
        <Stat label="Delivered" value={deliveredCount} tone="border-teal-200 bg-teal-50 text-teal-900" />
        <Stat label="Missed" value={missedCount} tone="border-rose-200 bg-rose-50 text-rose-900" />
      </div>
      <Panel title="Available deliveries" kicker="Driver">
        <div className="mb-4 grid gap-3 rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3">
          {canChooseDriver ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
              Driving as
              <select
                className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
                disabled={availableDrivers.length === 0}
                onChange={(event) => setSelectedDriver(event.target.value)}
                value={activeDriver?.userId ?? activeDriver?.name ?? ""}
              >
                {availableDrivers.length === 0 ? (
                  <option value="">No approved drivers</option>
                ) : (
                  availableDrivers.map((driver) => (
                    <option key={driver.userId ?? driver.email} value={driver.userId ?? driver.name}>
                      {driver.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase text-[#66736f]">Driving as</p>
              <p className="mt-1 font-bold text-[#26312f]">{activeDriver?.name ?? "Not approved"}</p>
            </div>
          )}
          {canChooseDriver && (
            <p className="text-sm font-semibold text-[#53645f]">Pending applications: {pendingDrivers.length}</p>
          )}
        </div>
        <div className="grid gap-3">
          {available.length === 0 ? (
            <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
              No deliveries are available to claim right now.
            </p>
          ) : (
            available.map((request) => (
              <DeliveryCard
                driverId={activeDriver?.userId ?? activeDriver?.name ?? ""}
                key={request.id}
                mode="available"
                request={request}
              />
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel title="Driver application" kicker="Volunteer">
          {auth?.role === "admin" ? (
            <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
              Driver applications are managed from the admin roster.
            </p>
          ) : currentApplication?.status === "approved" ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Approved to claim deliveries.
            </p>
          ) : currentApplication?.status === "pending" ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Your application is waiting for admin review.
            </p>
          ) : (
            <ActionForm action={submitDriverApplication} className="grid gap-3" successMessage="Driver application submitted.">
              {auth ? (
                <div className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3">
                  <p className="text-sm font-bold text-[#26312f]">{auth.name}</p>
                  <p className="mt-1 break-all text-sm text-[#66736f]">{auth.email}</p>
                </div>
              ) : (
                <Field label="Full name" maxLength={inputLimits.name} name="name" value="Safiya Noor" />
              )}
              <Field label="Telephone/cellphone" maxLength={inputLimits.phone} name="phone" value={auth ? "" : "(555) 013-7720"} />
              {!auth && <Field label="Email" maxLength={inputLimits.email} name="email" type="email" value="safiya@example.com" />}
              <SubmitButton label={currentApplication?.status === "denied" ? "Reapply" : "Submit application"} />
            </ActionForm>
          )}
        </Panel>

      <Panel
        action={
          assigned.length > 0 ? (
            <button
              className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold text-[#26312f]"
              onClick={() =>
                downloadCsv(
                  routeManifestToCsv(assigned),
                  routeManifestFilename(activeDriver?.name),
                )
              }
              type="button"
            >
              Download route
            </button>
          ) : undefined
        }
        title={auth?.role === "admin" ? "Assigned deliveries" : "Claimed by me"}
        kicker={activeDriver?.name ?? "Driver"}
      >
        <div className="grid gap-3">
          {assigned.length === 0 ? (
            <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
              {auth?.role === "admin"
                ? "This driver has no active assigned deliveries."
                : "You have not claimed any deliveries yet."}
            </p>
          ) : (
            assigned.map((request) => (
              <DeliveryCard
                driverId={activeDriver?.userId ?? activeDriver?.name ?? ""}
                key={request.id}
                mode="claimed"
                request={request}
              />
            ))
          )}
        </div>
      </Panel>
        <Panel title="Delivery history" kicker={activeDriver?.name ?? "Driver"}>
          {completed.length === 0 ? (
            <p className="text-sm font-semibold text-[#53645f]">
              No completed delivery attempts for this season yet.
            </p>
          ) : (
            <div className="divide-y divide-[#edf0ed]">
              {completed.map((request) => {
                const completion = [...(request.deliveryActivity ?? [])]
                  .reverse()
                  .find((activity) => activity.title === `Status: ${request.status}`);

                return (
                  <div className="py-3 first:pt-0 last:pb-0" key={request.recordId ?? request.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{request.recipient}</p>
                        <p className="mt-1 text-xs font-semibold text-[#66736f]">{request.id}</p>
                      </div>
                      <StatusPill status={request.status} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#66736f]">{request.updated}</p>
                    {request.status === "Not delivered" && completion && (
                      <p className="mt-2 text-sm leading-6 text-[#53645f]">{completion.detail}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  action,
  children,
  kicker,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#d8ded7] bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-2 border-b border-[#e3e8e4] px-4 py-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#66736f]">{kicker}</p>
          <h2 className="mt-1 text-lg font-bold text-[#111817]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ActionButton({
  action,
  label,
  primary = false,
}: {
  action: (formData: FormData) => Promise<DashboardActionResult>;
  label: string;
  primary?: boolean;
}) {
  return (
    <ActionForm action={action} successMessage={`${label} complete.`}>
      <button
        className={`rounded-md px-3 py-2 text-sm font-bold ${
          primary ? "bg-[#1f5d54] text-white" : "border border-[#c9d3ce] text-[#26312f]"
        }`}
        type="submit"
      >
        {label}
      </button>
    </ActionForm>
  );
}

function SelectedRequestFields({ ids }: { ids: string[] }) {
  return ids.map((id) => <input key={id} name="requestId" type="hidden" value={id} />);
}

function ActionForm({
  action,
  children,
  className,
  onSuccess,
  successMessage,
}: {
  action: (formData: FormData) => Promise<DashboardActionResult>;
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
  successMessage: string;
}) {
  const [state, setState] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [pending, setPending] = useState(false);

  async function formAction(formData: FormData) {
    setPending(true);
    setState(null);

    try {
      const result = await action(formData);
      if (result.ok) onSuccess?.();
      setState(
        result.ok
          ? { message: successMessage, tone: "success" }
          : { message: result.error, tone: "error" },
      );
    } catch {
      setState({ message: "Something went wrong. Please try again.", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={formAction} className={className}>
      <fieldset className="contents" disabled={pending}>
        {children}
      </fieldset>
      {(pending || state) && (
        <p
          aria-live="polite"
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            state?.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {pending ? "Working..." : state?.message}
        </p>
      )}
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button className="rounded-md bg-[#1f5d54] px-4 py-3 font-bold text-white shadow-sm" type="submit">
      {label}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${tone}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-sm font-semibold">{label}</p>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-lg font-bold text-[#17201f]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#66736f]">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${statusTone[status]}`}>{status}</span>;
}

function Field({
  label,
  maxLength,
  name,
  type = "text",
  value,
}: {
  label: string;
  maxLength?: number;
  name: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
      {label}
      <input
        className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
        defaultValue={value}
        maxLength={maxLength}
        min={type === "number" ? 1 : undefined}
        name={name}
        required
        type={type}
      />
    </label>
  );
}

function RequestTimeline({ request }: { request?: DistributionRequest }) {
  if (!request) {
    return (
      <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
        Submit a request to see its progress.
      </p>
    );
  }

  const currentIndex = getRequestProgressIndex(request.status);
  const items: { detail: string; status: RequestStatus }[] = [
    { status: "Submitted", detail: "Request received by the mosque." },
    { status: "Under review", detail: "Admin reviews family information and box weight." },
    { status: "Approved", detail: "Food box is approved and available to drivers." },
    { status: "Driver assigned", detail: "A volunteer driver claims the delivery and receives contact details." },
    { status: "Heading to pickup", detail: "The driver is heading to the mosque for pickup." },
    { status: "Picked up", detail: "The food box has been picked up from the mosque." },
    { status: "Out for delivery", detail: "The driver is on the way to the recipient address." },
    { status: "Delivered", detail: "The food box has reached the family." },
  ];

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm">
        <p className="font-bold">{request.id}</p>
        <p className="mt-1 text-[#53645f]">{request.recipient}</p>
      </div>
      {(request.status === "Denied" || request.status === "Not delivered") && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {request.status === "Denied"
            ? "This request was denied by the admin team."
            : "The delivery attempt was marked not delivered and needs follow-up."}
        </p>
      )}
      <ol className="grid gap-3">
      {items.map((item) => (
        <li className="grid grid-cols-[22px_1fr] gap-3" key={item.status}>
          <span
            aria-hidden="true"
            className={`mt-1 h-3 w-3 rounded-full border ${
              requestProgressOrder.indexOf(item.status) <= currentIndex
                ? "border-[#1f5d54] bg-[#1f5d54]"
                : "border-[#b8c4bf] bg-white"
            }`}
          />
          <span>
            <span className="block font-bold">{item.status}</span>
            <span className="mt-1 block text-sm leading-6 text-[#66736f]">{item.detail}</span>
          </span>
        </li>
      ))}
      </ol>
      <DeliveryActivityList activities={request.deliveryActivity ?? []} />
    </div>
  );
}

function DeliveryActivityList({
  activities,
  showEmpty = false,
}: {
  activities: DeliveryActivity[];
  showEmpty?: boolean;
}) {
  if (activities.length === 0 && !showEmpty) return null;

  return (
    <div className="mt-4 border-t border-[#dfe5e1] pt-4">
      <h3 className="text-sm font-bold text-[#26312f]">Request activity</h3>
      {activities.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-[#66736f]">No request activity has been recorded yet.</p>
      ) : (
        <ol className="mt-3 grid gap-3">
          {activities.map((activity) => (
            <li className="grid grid-cols-[10px_1fr] gap-3" key={activity.id}>
              <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#1f5d54]" />
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-[#26312f]">{activity.title}</p>
                  <p className="text-xs font-semibold text-[#66736f]">{activity.occurred}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#53645f]">{activity.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DeliveryCard({
  driverId,
  mode,
  request,
}: {
  driverId: string;
  mode: "available" | "claimed";
  request: DistributionRequest;
}) {
  return (
    <article className="rounded-md border border-[#dfe5e1] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{request.recipient}</p>
            <StatusPill status={request.status} />
          </div>
          <p className="mt-1 text-sm text-[#66736f]">{request.id}</p>
        </div>
        <p className="text-sm font-bold text-[#1f5d54]">{request.boxWeight}</p>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <Info label="Phone" value={request.phone} />
        <Info label="Address" value={request.address} />
        <Info label="Household" value={`${request.householdSize} people`} />
        <Info label="Instructions" value={request.instructions} />
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-center text-sm font-bold" href={`tel:${request.phone}`}>
          Call
        </a>
        <a
          className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-center text-sm font-bold"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address)}`}
          rel="noreferrer"
          target="_blank"
        >
          Open map
        </a>
      </div>

      {mode === "available" ? (
        <ActionForm action={claimDelivery.bind(null, request.recordId ?? request.id)} successMessage="Delivery claimed.">
          <input name="driver" type="hidden" value={driverId} />
          <button
            className="mt-4 w-full rounded-md bg-[#1f5d54] px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9aaaa5]"
            disabled={driverId === ""}
            type="submit"
          >
            Claim delivery
          </button>
        </ActionForm>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {request.status === "Driver assigned" && (
            <ActionButton action={updateDeliveryStatus.bind(null, request.recordId ?? request.id, "Heading to pickup")} label="Heading to pickup" primary />
          )}
          {request.status === "Heading to pickup" && (
            <ActionButton action={updateDeliveryStatus.bind(null, request.recordId ?? request.id, "Picked up")} label="Picked up" primary />
          )}
          {request.status === "Picked up" && (
            <ActionButton action={updateDeliveryStatus.bind(null, request.recordId ?? request.id, "Out for delivery")} label="Start route" primary />
          )}
          {request.status === "Out for delivery" && (
            <>
              <div className="sm:col-span-2">
                <ActionButton action={updateDeliveryStatus.bind(null, request.recordId ?? request.id, "Delivered")} label="Delivered" primary />
              </div>
              <ActionForm
                action={updateDeliveryStatus.bind(null, request.recordId ?? request.id, "Not delivered")}
                className="grid gap-2 rounded-md border border-[#e8c9cd] bg-[#fff7f7] p-3 sm:col-span-2"
                successMessage="Delivery marked not delivered."
              >
                <label className="text-sm font-bold text-[#692a33]" htmlFor={`missed-reason-${request.id}`}>
                  Reason delivery was missed
                </label>
                <textarea
                  className="min-h-20 resize-y rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm"
                  id={`missed-reason-${request.id}`}
                  maxLength={500}
                  minLength={5}
                  name="reason"
                  placeholder="For example: no one answered after calling."
                  required
                />
                <button
                  className="rounded-md border border-[#b95c68] bg-white px-3 py-2 text-sm font-bold text-[#8b3440]"
                  type="submit"
                >
                  Mark not delivered
                </button>
              </ActionForm>
            </>
          )}
          {["Driver assigned", "Heading to pickup"].includes(request.status) && (
            <ActionButton action={unclaimDelivery.bind(null, request.recordId ?? request.id)} label="Unclaim" />
          )}
        </div>
      )}
    </article>
  );
}

function RequestDetails({ request }: { request: DistributionRequest }) {
  return (
    <dl className="grid gap-4 rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-4 md:grid-cols-2">
      <Info label="Recipient" value={request.recipient} />
      <Info label="Status" value={request.status} />
      <Info label="Email" value={request.email} />
      <Info label="Phone" value={request.phone} />
      <Info label="Address" value={request.address} />
      <Info label="Household" value={`${request.householdSize} people`} />
      <Info label="Box weight" value={request.boxWeight} />
      <Info label="Driver" value={request.driver ?? "Unassigned"} />
      <div className="md:col-span-2">
        <Info label="Delivery instructions" value={request.instructions} />
      </div>
    </dl>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-[#26312f]">{label}</dt>
      <dd className="mt-0.5 leading-6 text-[#53645f]">{value}</dd>
    </div>
  );
}
