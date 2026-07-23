export type Role = "recipient" | "admin" | "driver";

export type RequestStatus =
  | "Submitted"
  | "Under review"
  | "Approved"
  | "Driver assigned"
  | "Heading to pickup"
  | "Picked up"
  | "Out for delivery"
  | "Delivered"
  | "Not delivered"
  | "Denied";

export type DistributionRequest = {
  id: string;
  recordId?: string;
  recipient: string;
  phone: string;
  email: string;
  address: string;
  householdSize: number;
  boxWeight: string;
  instructions: string;
  status: RequestStatus;
  driver?: string;
  updated: string;
};

export type PendingDriver = {
  name: string;
  phone: string;
  email: string;
  userId?: string;
};

export type DriverApplicationStatus = "pending" | "approved" | "denied";

export type CurrentDriverApplication = PendingDriver & {
  status: DriverApplicationStatus;
};

export type Season = {
  id: string;
  name: string;
  isActive: boolean;
  startsOn?: string;
  endsOn?: string;
};

export type DriverApplicationDecision = "approved" | "denied";

export type DriverApplicationInput = PendingDriver;

export type FamilySizeRow = {
  size: string;
  approved: number;
  denied: number;
  delivered: number;
};

export type DashboardData = {
  activeSeason?: Season;
  approvedDrivers: PendingDriver[];
  currentDriverApplication?: CurrentDriverApplication;
  deniedDrivers: PendingDriver[];
  familySizeRows: FamilySizeRow[];
  pendingDrivers: PendingDriver[];
  requests: DistributionRequest[];
};
