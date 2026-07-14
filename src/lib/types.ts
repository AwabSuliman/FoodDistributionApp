export type Role = "recipient" | "admin" | "driver";

export type RequestStatus =
  | "Submitted"
  | "Under review"
  | "Approved"
  | "Driver assigned"
  | "Out for delivery"
  | "Delivered"
  | "Not delivered"
  | "Denied";

export type DistributionRequest = {
  id: string;
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
  approvedDrivers: PendingDriver[];
  deniedDrivers: PendingDriver[];
  familySizeRows: FamilySizeRow[];
  pendingDrivers: PendingDriver[];
  requests: DistributionRequest[];
};
