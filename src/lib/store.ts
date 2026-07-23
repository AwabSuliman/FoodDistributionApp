import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DashboardData,
  DistributionRequest,
  DriverApplicationDecision,
  DriverApplicationInput,
  FamilySizeRow,
  PendingDriver,
  RequestEditInput,
  RequestStatus,
} from "./types";

type AppState = {
  approvedDrivers: PendingDriver[];
  deniedDrivers: PendingDriver[];
  nextRequestNumber: number;
  pendingDrivers: PendingDriver[];
  requests: DistributionRequest[];
};

type RequestInput = {
  address: string;
  email: string;
  householdSize: number;
  instructions: string;
  phone: string;
  recipient: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "zakatul-fitr-state.json");
const ACTIVE_STATUSES: RequestStatus[] = ["Approved", "Driver assigned", "Out for delivery", "Delivered", "Not delivered"];

const initialState: AppState = {
  approvedDrivers: [
    { name: "Omar Hassan", phone: "(555) 019-2881", email: "omar@example.com" },
    { name: "Layla Ahmed", phone: "(555) 012-7810", email: "layla@example.com" },
    { name: "Ibrahim Said", phone: "(555) 016-5301", email: "ibrahim@example.com" },
  ],
  deniedDrivers: [],
  nextRequestNumber: 1043,
  requests: [
    {
      id: "MWI-1042",
      recipient: "Amina Rahman",
      phone: "(555) 018-4402",
      email: "amina@example.com",
      address: "1248 Crescent Ave, Springfield, VA",
      householdSize: 6,
      boxWeight: "42 lb",
      instructions: "Call when outside. Apartment is on the second floor.",
      status: "Approved",
      updated: "12 min ago",
    },
    {
      id: "MWI-1041",
      recipient: "Yusuf Ali",
      phone: "(555) 019-2881",
      email: "yusuf@example.com",
      address: "790 Maple Ridge Ct, Springfield, VA",
      householdSize: 3,
      boxWeight: "26 lb",
      instructions: "Leave with adult family member only.",
      status: "Driver assigned",
      driver: "Omar Hassan",
      updated: "25 min ago",
    },
    {
      id: "MWI-1040",
      recipient: "Samira Osman",
      phone: "(555) 012-7810",
      email: "samira@example.com",
      address: "45 Hillcrest Dr, Annandale, VA",
      householdSize: 5,
      boxWeight: "36 lb",
      instructions: "Ring bell twice. Family prefers evening delivery.",
      status: "Not delivered",
      driver: "Layla Ahmed",
      updated: "44 min ago",
    },
    {
      id: "MWI-1039",
      recipient: "Nadia Khan",
      phone: "(555) 014-9320",
      email: "nadia@example.com",
      address: "302 Pineview Ln, Falls Church, VA",
      householdSize: 4,
      boxWeight: "32 lb",
      instructions: "Front entrance faces the parking lot.",
      status: "Under review",
      updated: "1 hr ago",
    },
    {
      id: "MWI-1038",
      recipient: "Hassan Noor",
      phone: "(555) 016-5301",
      email: "hassan@example.com",
      address: "18 Meadow St, Springfield, VA",
      householdSize: 2,
      boxWeight: "18 lb",
      instructions: "Recipient requested delivery after Asr.",
      status: "Delivered",
      driver: "Ibrahim Said",
      updated: "Today",
    },
    {
      id: "MWI-1037",
      recipient: "Maryam Farah",
      phone: "(555) 011-9044",
      email: "maryam@example.com",
      address: "911 Brookside Way, Annandale, VA",
      householdSize: 7,
      boxWeight: "48 lb",
      instructions: "Admin should confirm address before approval.",
      status: "Submitted",
      updated: "Today",
    },
  ],
  pendingDrivers: [
    { name: "Zain Malik", phone: "(555) 011-2109", email: "zain@example.com" },
    { name: "Huda Saleh", phone: "(555) 015-4431", email: "huda@example.com" },
  ],
};

function normalizeState(state: Partial<AppState>): AppState {
  return {
    approvedDrivers: state.approvedDrivers ?? initialState.approvedDrivers,
    deniedDrivers: state.deniedDrivers ?? [],
    nextRequestNumber: state.nextRequestNumber ?? initialState.nextRequestNumber,
    pendingDrivers: state.pendingDrivers ?? [],
    requests: state.requests ?? [],
  };
}

async function readState(): Promise<AppState> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    return normalizeState(JSON.parse(await readFile(DATA_FILE, "utf8")) as Partial<AppState>);
  } catch {
    await writeState(initialState);
    return initialState;
  }
}

async function writeState(state: AppState) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function boxWeightForHousehold(householdSize: number) {
  return `${Math.max(1, householdSize) * 7} lb`;
}

function familyGroupForSize(householdSize: number) {
  if (householdSize <= 2) return "1-2";
  if (householdSize <= 4) return "3-4";
  if (householdSize <= 6) return "5-6";
  return "7+";
}

function makeFamilySizeRows(requests: DistributionRequest[]): FamilySizeRow[] {
  return ["1-2", "3-4", "5-6", "7+"].map((size) => {
    const groupRequests = requests.filter((request) => familyGroupForSize(request.householdSize) === size);

    return {
      size,
      approved: groupRequests.filter((request) => ACTIVE_STATUSES.includes(request.status)).length,
      denied: groupRequests.filter((request) => request.status === "Denied").length,
      delivered: groupRequests.filter((request) => request.status === "Delivered").length,
    };
  });
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase();
}

function hasOpenRequestForFamily(requests: DistributionRequest[], input: RequestInput) {
  const email = normalizeComparable(input.email);
  const phone = normalizeComparable(input.phone);

  return requests.some(
    (request) =>
      request.status !== "Denied" &&
      request.status !== "Delivered" &&
      (normalizeComparable(request.email) === email || normalizeComparable(request.phone) === phone),
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  const state = await readState();

  return {
    approvedDrivers: state.approvedDrivers,
    deniedDrivers: state.deniedDrivers,
    familySizeRows: makeFamilySizeRows(state.requests),
    pendingDrivers: state.pendingDrivers,
    requests: state.requests,
  };
}

export async function createRequest(input: RequestInput) {
  const state = await readState();

  if (hasOpenRequestForFamily(state.requests, input)) {
    throw new Error("This family already has an open request.");
  }

  const id = `MWI-${state.nextRequestNumber}`;

  const request: DistributionRequest = {
    ...input,
    id,
    boxWeight: boxWeightForHousehold(input.householdSize),
    status: "Submitted",
    updated: "Just now",
  };

  await writeState({
    ...state,
    nextRequestNumber: state.nextRequestNumber + 1,
    requests: [request, ...state.requests],
  });

  return request;
}

export async function setRequestStatus(id: string, status: RequestStatus) {
  const state = await readState();

  await writeState({
    ...state,
    requests: state.requests.map((request) =>
      request.id === id
        ? {
            ...request,
            driver: status === "Approved" || status === "Denied" ? undefined : request.driver,
            status,
            updated: "Just now",
          }
        : request,
    ),
  });
}

export async function updateRequestDetails(id: string, input: RequestEditInput) {
  const state = await readState();

  await writeState({
    ...state,
    requests: state.requests.map((request) =>
      request.id === id
        ? {
            ...request,
            address: input.address,
            boxWeight: `${input.boxWeightLbs} lb`,
            email: input.email,
            householdSize: input.householdSize,
            instructions: input.instructions,
            phone: input.phone,
            recipient: input.recipient,
            updated: "Just now",
          }
        : request,
    ),
  });
}

export async function claimRequest(id: string, driver = "Omar Hassan") {
  const state = await readState();

  await writeState({
    ...state,
    requests: state.requests.map((request) =>
      request.id === id && (request.status === "Approved" || request.status === "Not delivered")
        ? {
            ...request,
            driver,
            status: "Driver assigned",
            updated: "Just now",
          }
        : request,
    ),
  });
}

export async function createDriverApplication(input: DriverApplicationInput) {
  const state = await readState();
  const email = normalizeComparable(input.email);
  const allApplications = [...state.pendingDrivers, ...state.approvedDrivers];

  if (allApplications.some((driver) => normalizeComparable(driver.email) === email)) {
    throw new Error("This driver application already exists.");
  }

  await writeState({
    ...state,
    deniedDrivers: state.deniedDrivers.filter((driver) => normalizeComparable(driver.email) !== email),
    pendingDrivers: [input, ...state.pendingDrivers],
  });
}

export async function resolvePendingDriver(email: string, decision: DriverApplicationDecision) {
  const state = await readState();
  const driver = state.pendingDrivers.find((pendingDriver) => pendingDriver.email === email);

  if (!driver) {
    return;
  }

  const approvedDrivers =
    decision === "approved" && !state.approvedDrivers.some((approvedDriver) => approvedDriver.email === email)
      ? [...state.approvedDrivers, driver]
      : state.approvedDrivers.filter((approvedDriver) => approvedDriver.email !== email);
  const deniedDrivers =
    decision === "denied" && !state.deniedDrivers.some((deniedDriver) => deniedDriver.email === email)
      ? [...state.deniedDrivers, driver]
      : state.deniedDrivers.filter((deniedDriver) => deniedDriver.email !== email);

  await writeState({
    ...state,
    approvedDrivers,
    deniedDrivers,
    pendingDrivers: state.pendingDrivers.filter((driver) => driver.email !== email),
  });
}
