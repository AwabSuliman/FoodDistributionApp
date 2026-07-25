import type { Season, SeasonInput } from "./types";

export type SeasonInputResult = { data: SeasonInput; ok: true } | { error: string; ok: false };

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseSeasonInput(formData: FormData): SeasonInputResult {
  const name = readText(formData, "name");
  const startsOn = readText(formData, "startsOn");
  const endsOn = readText(formData, "endsOn");

  if (name.length < 2 || name.length > 100) return { error: "Enter a season name.", ok: false };
  if (!isIsoDate(startsOn) || !isIsoDate(endsOn)) return { error: "Enter valid season dates.", ok: false };
  if (endsOn < startsOn) return { error: "Season end date must be after its start date.", ok: false };
  if (formData.get("confirmActivation") !== "yes") {
    return { error: "Confirm that you want to archive the current season.", ok: false };
  }

  return { data: { endsOn, name, startsOn }, ok: true };
}

function formatDate(value?: string) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function seasonDateRange(season?: Season) {
  const startsOn = formatDate(season?.startsOn);
  const endsOn = formatDate(season?.endsOn);

  if (startsOn && endsOn) return `${startsOn} - ${endsOn}`;
  return startsOn ?? endsOn ?? "Dates not set";
}
