export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = SignInInput & {
  name: string;
  role: "driver" | "recipient";
};

export type PasswordUpdateInput = {
  password: string;
};

export type AuthInputResult<T> = { data: T; ok: true } | { error: string; ok: false };

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function readEmail(formData: FormData): AuthInputResult<string> {
  const email = readText(formData, "email").toLowerCase();

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", ok: false };
  }

  return { data: email, ok: true };
}

export function parseSignInInput(formData: FormData): AuthInputResult<SignInInput> {
  const email = readEmail(formData);
  const password = readText(formData, "password");

  if (!email.ok) return email;
  if (!password) return { error: "Enter your password.", ok: false };

  return { data: { email: email.data, password }, ok: true };
}

export function parseSignUpInput(formData: FormData): AuthInputResult<SignUpInput> {
  const signInInput = parseSignInInput(formData);
  const name = readText(formData, "name");
  const role = formData.get("role");

  if (!signInInput.ok) return signInInput;
  if (name.length < 2 || name.length > 100) return { error: "Enter your full name.", ok: false };
  if (signInInput.data.password.length < 8) {
    return { error: "Use at least 8 characters for your password.", ok: false };
  }
  if (role !== "driver" && role !== "recipient") {
    return { error: "Choose recipient or driver.", ok: false };
  }

  return { data: { ...signInInput.data, name, role }, ok: true };
}

export function parsePasswordResetRequest(formData: FormData): AuthInputResult<{ email: string }> {
  const email = readEmail(formData);
  return email.ok ? { data: { email: email.data }, ok: true } : email;
}

export function parsePasswordUpdateInput(formData: FormData): AuthInputResult<PasswordUpdateInput> {
  const password = readText(formData, "password");
  const confirmation = readText(formData, "passwordConfirmation");

  if (password.length < 8) return { error: "Use at least 8 characters for your password.", ok: false };
  if (password !== confirmation) return { error: "Passwords do not match.", ok: false };

  return { data: { password }, ok: true };
}

export function authErrorMessage(message: string, action: "reset" | "signin" | "signup") {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) return "Incorrect email or password.";
  if (normalizedMessage.includes("email not confirmed")) return "Confirm your email before signing in.";
  if (normalizedMessage.includes("user already registered")) return "An account already exists for this email.";
  if (normalizedMessage.includes("rate limit")) return "Too many attempts. Wait a moment and try again.";

  if (action === "signin") return "Unable to sign in right now. Please try again.";
  if (action === "signup") return "Unable to create your account right now. Please try again.";
  return "Unable to reset your password right now. Please try again.";
}
