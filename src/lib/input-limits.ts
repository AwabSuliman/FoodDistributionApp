export const inputLimits = {
  address: 300,
  email: 254,
  instructions: 1000,
  name: 120,
  phone: 40,
  seasonName: 100,
} as const;

export type RequiredTextResult = { data: string; ok: true } | { error: string; ok: false };

export function validateRequiredText(
  value: unknown,
  label: string,
  maxLength: number,
): RequiredTextResult {
  if (typeof value !== "string" || value.trim() === "") {
    return { error: `${label} is required.`, ok: false };
  }

  const text = value.trim();

  if (text.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { data: text, ok: true };
}
