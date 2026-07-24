import type { DistributionRequest } from "./types";

const columns: { heading: string; value: (request: DistributionRequest) => number | string }[] = [
  { heading: "Request", value: (request) => request.id },
  { heading: "Recipient", value: (request) => request.recipient },
  { heading: "Email", value: (request) => request.email },
  { heading: "Phone", value: (request) => request.phone },
  { heading: "Address", value: (request) => request.address },
  { heading: "Household members", value: (request) => request.householdSize },
  { heading: "Box weight", value: (request) => request.boxWeight },
  { heading: "Status", value: (request) => request.status },
  { heading: "Driver", value: (request) => request.driver ?? "Unassigned" },
  { heading: "Delivery instructions", value: (request) => request.instructions },
  { heading: "Updated", value: (request) => request.updated },
];

function csvCell(value: number | string) {
  const text = String(value);
  const spreadsheetSafe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${spreadsheetSafe.replaceAll('"', '""')}"`;
}

export function requestsToCsv(requests: DistributionRequest[]) {
  const headings = columns.map((column) => csvCell(column.heading)).join(",");
  const rows = requests.map((request) => columns.map((column) => csvCell(column.value(request))).join(","));
  return [headings, ...rows].join("\r\n");
}

export function requestCsvFilename(seasonName?: string) {
  const season = (seasonName ?? "active-season")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `distribution-requests-${season || "active-season"}.csv`;
}
