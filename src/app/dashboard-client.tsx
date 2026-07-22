"use client";

import { useMemo, useState } from "react";
import {
  claimDelivery,
  resolveDriverApplication,
  submitDriverApplication,
  submitRequest,
  updateDeliveryStatus,
  updateRequestStatus,
} from "./actions";
import { signOut } from "./login/actions";
import type { AuthProfile } from "@/lib/auth";
import type { DashboardData, DistributionRequest, RequestStatus, Role } from "@/lib/types";

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
  "Out for delivery",
  "Delivered",
  "Not delivered",
  "Denied",
];

export function Dashboard({ auth, data }: { auth: AuthProfile | null; data: DashboardData }) {
  const visibleRoleOptions =
    auth?.role === "admin" || !auth ? roleOptions : roleOptions.filter((option) => option.role === auth.role);
  const [activeRole, setActiveRole] = useState<Role>(visibleRoleOptions[0]?.role ?? "recipient");
  const { familySizeRows, pendingDrivers, requests } = data;
  const stats = useMemo(
    () => ({
      review: requests.filter((request) => ["Submitted", "Under review"].includes(request.status)).length,
      available: requests.filter((request) => request.status === "Approved").length,
      assigned: requests.filter((request) => request.status === "Driver assigned").length,
      enRoute: requests.filter((request) => request.status === "Out for delivery").length,
      repeat: requests.filter((request) => request.status === "Not delivered").length,
      delivered: requests.filter((request) => request.status === "Delivered").length,
    }),
    [requests],
  );

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#17201f]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="border-b border-[#d8ded7] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold tracking-wide text-[#53645f]">Masjid Al-Wasatiyah Wal-Itidaal</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111817] sm:text-3xl">
                SadaqahFlow
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
              {auth && (
                <form action={signOut} className="justify-self-start lg:justify-self-end">
                  <button className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-sm font-bold text-[#26312f]">
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-5">
            {activeRole === "recipient" && <RecipientView requests={requests} />}
            {activeRole === "admin" && (
              <AdminView
                approvedDrivers={data.approvedDrivers}
                deniedDrivers={data.deniedDrivers}
                familySizeRows={familySizeRows}
                pendingDrivers={pendingDrivers}
                requests={requests}
                stats={stats}
              />
            )}
            {activeRole === "driver" && (
              <DriverView
                approvedDrivers={data.approvedDrivers}
                auth={auth}
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

function RecipientView({ requests }: { requests: DistributionRequest[] }) {
  const latestRequest = requests[0];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel
        title="Request a food box"
        kicker="Recipient"
        action={<span className="text-sm font-semibold text-[#66736f]">One request per family</span>}
      >
        <div className="mb-5 rounded-md border border-[#e6d8b8] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#76521d]">
          Each family can submit one request. If a delivery attempt fails, please contact the driver.
        </div>
        <ActionForm action={submitRequest} className="grid gap-4" successMessage="Request submitted.">
          <Field label="Full name" name="recipient" value="Fatima Ahmed" />
          <Field label="Address" name="address" value="216 Garden View Rd, Springfield, VA" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Telephone/cellphone" name="phone" value="(555) 017-6641" />
            <Field label="Email" name="email" type="email" value="fatima@example.com" />
          </div>
          <Field label="Household members" name="householdSize" type="number" value="6" />
          <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
            Delivery instructions
            <textarea
              className="min-h-28 rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
              defaultValue="Call when outside. Apartment is on the second floor."
              name="instructions"
              required
            />
          </label>
          <SubmitButton label="Submit request" />
        </ActionForm>
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
  approvedDrivers,
  deniedDrivers,
  familySizeRows,
  pendingDrivers,
  requests,
  stats,
}: {
  approvedDrivers: DashboardData["approvedDrivers"];
  deniedDrivers: DashboardData["deniedDrivers"];
  familySizeRows: DashboardData["familySizeRows"];
  pendingDrivers: DashboardData["pendingDrivers"];
  requests: DistributionRequest[];
  stats: { review: number; available: number; assigned: number; enRoute: number; repeat: number; delivered: number };
}) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "All">("All");
  const [query, setQuery] = useState("");
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
        <Panel title="Requests" kicker="Admin dashboard">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dfe5e1] text-xs uppercase tracking-wide text-[#66736f]">
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
                        <ActionButton action={updateRequestStatus.bind(null, request.id, "Under review")} label="Review" />
                        <ActionButton action={updateRequestStatus.bind(null, request.id, "Approved")} label="Approve" primary />
                        <ActionButton action={updateRequestStatus.bind(null, request.id, "Denied")} label="Deny" />
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
        </Panel>

        <div className="grid gap-5">
          <Panel title="Driver approvals" kicker="Pending">
            <div className="grid gap-3">
              {pendingDrivers.length === 0 ? (
                <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
                  No pending driver applications.
                </p>
              ) : (
                pendingDrivers.map((driver) => (
                  <div className="rounded-md border border-[#dfe5e1] bg-white p-3" key={driver.email}>
                    <p className="font-bold">{driver.name}</p>
                    <p className="mt-1 text-sm text-[#66736f]">{driver.phone}</p>
                    <p className="text-sm text-[#66736f]">{driver.email}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <ActionButton
                        action={resolveDriverApplication.bind(null, driver.email, "approved")}
                        label="Approve"
                        primary
                      />
                      <ActionButton action={resolveDriverApplication.bind(null, driver.email, "denied")} label="Deny" />
                    </div>
                  </div>
                ))
              )}
              <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[#53645f]">
                <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] px-3 py-2">
                  Approved: {approvedDrivers.length}
                </p>
                <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] px-3 py-2">Denied: {deniedDrivers.length}</p>
              </div>
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
        </div>
      </div>
    </section>
  );
}

function DriverView({
  approvedDrivers,
  auth,
  pendingDrivers,
  requests,
}: {
  approvedDrivers: DashboardData["approvedDrivers"];
  auth: AuthProfile | null;
  pendingDrivers: DashboardData["pendingDrivers"];
  requests: DistributionRequest[];
}) {
  const availableDrivers =
    auth?.role === "admin"
      ? approvedDrivers
      : approvedDrivers.filter((driver) => driver.email.toLowerCase() === auth?.email.toLowerCase());
  const driverNames = availableDrivers.map((driver) => driver.name);
  const [selectedDriver, setSelectedDriver] = useState(driverNames[0] ?? "");
  const activeDriver = selectedDriver || driverNames[0] || "";
  const available = requests.filter((request) => ["Approved", "Not delivered"].includes(request.status));
  const assigned = requests.filter((request) => request.driver === activeDriver && request.status !== "Delivered");

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel title="Available deliveries" kicker="Driver">
        <div className="mb-4 grid gap-3 rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3">
          <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
            Driving as
            <select
              className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
              disabled={driverNames.length === 0}
              onChange={(event) => setSelectedDriver(event.target.value)}
              value={activeDriver}
            >
              {driverNames.length === 0 ? (
                <option value="">No approved drivers</option>
              ) : (
                driverNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </label>
          <p className="text-sm font-semibold text-[#53645f]">Pending applications: {pendingDrivers.length}</p>
        </div>
        <div className="grid gap-3">
          {available.length === 0 ? (
            <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
              No deliveries are available to claim right now.
            </p>
          ) : (
            available.map((request) => (
              <DeliveryCard driverName={activeDriver} key={request.id} mode="available" request={request} />
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel title="Driver application" kicker="Volunteer">
          <ActionForm action={submitDriverApplication} className="grid gap-3" successMessage="Driver application submitted.">
            <Field label="Full name" name="name" value="Safiya Noor" />
            <Field label="Telephone/cellphone" name="phone" value="(555) 013-7720" />
            <Field label="Email" name="email" type="email" value="safiya@example.com" />
            <SubmitButton label="Submit application" />
          </ActionForm>
        </Panel>

      <Panel title="Claimed by me" kicker={activeDriver || "Driver"}>
        <div className="grid gap-3">
          {assigned.length === 0 ? (
            <p className="rounded-md border border-[#dfe5e1] bg-[#f8faf8] p-3 text-sm font-semibold text-[#53645f]">
              You have not claimed any deliveries yet.
            </p>
          ) : (
            assigned.map((request) => (
              <DeliveryCard driverName={activeDriver} key={request.id} mode="claimed" request={request} />
            ))
          )}
        </div>
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
  action: (formData: FormData) => void | Promise<void>;
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

function ActionForm({
  action,
  children,
  className,
  successMessage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  successMessage: string;
}) {
  const [state, setState] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [pending, setPending] = useState(false);

  async function formAction(formData: FormData) {
    setPending(true);
    setState(null);

    try {
      await action(formData);
      setState({ message: successMessage, tone: "success" });
    } catch (error) {
      setState({ message: error instanceof Error ? error.message : "Something went wrong.", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={formAction} className={className}>
      {children}
      {(pending || state) && (
        <p
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

function StatusPill({ status }: { status: RequestStatus }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${statusTone[status]}`}>{status}</span>;
}

function Field({ label, name, type = "text", value }: { label: string; name: string; type?: string; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#26312f]">
      {label}
      <input
        className="rounded-md border border-[#c9d3ce] bg-white px-3 py-2 text-base font-normal outline-none transition focus:border-[#1f5d54] focus:ring-2 focus:ring-[#1f5d54]/15"
        defaultValue={value}
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

  const progressOrder: RequestStatus[] = [
    "Submitted",
    "Under review",
    "Approved",
    "Driver assigned",
    "Out for delivery",
    "Delivered",
  ];
  const currentIndex =
    request.status === "Denied" || request.status === "Not delivered"
      ? progressOrder.indexOf("Approved")
      : progressOrder.indexOf(request.status);
  const items: { detail: string; status: RequestStatus }[] = [
    { status: "Submitted", detail: "Request received by the mosque." },
    { status: "Under review", detail: "Admin reviews family information and box weight." },
    { status: "Approved", detail: "Food box is approved and available to drivers." },
    { status: "Driver assigned", detail: "A volunteer driver claims the delivery and receives contact details." },
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
              progressOrder.indexOf(item.status) <= currentIndex
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
    </div>
  );
}

function DeliveryCard({
  driverName,
  mode,
  request,
}: {
  driverName: string;
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

      {mode === "available" ? (
        <ActionForm action={claimDelivery.bind(null, request.id)} successMessage="Delivery claimed.">
          <input name="driver" type="hidden" value={driverName} />
          <button
            className="mt-4 w-full rounded-md bg-[#1f5d54] px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9aaaa5]"
            disabled={driverName === ""}
            type="submit"
          >
            Claim delivery
          </button>
        </ActionForm>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ActionButton action={updateDeliveryStatus.bind(null, request.id, "Out for delivery")} label="Start route" primary />
          <ActionButton action={updateDeliveryStatus.bind(null, request.id, "Delivered")} label="Delivered" />
          <ActionButton action={updateDeliveryStatus.bind(null, request.id, "Not delivered")} label="Missed" />
        </div>
      )}
    </article>
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
