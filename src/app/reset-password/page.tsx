import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getSupabaseConfig } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  if (!getSupabaseConfig() || !(await getAuthenticatedProfile())) {
    redirect("/login?error=Your%20password%20reset%20link%20has%20expired.%20Request%20a%20new%20one.");
  }

  return (
    <main className="flex min-h-screen items-center bg-[#f4f5f1] px-4 py-10 text-[#17201f]">
      <div className="mx-auto grid w-full max-w-md gap-5">
        <div>
          <p className="text-xs font-bold tracking-wide text-[#53645f]">Masjid Al-Wasatiyah Wal-Itidaal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111817]">Choose a new password</h1>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
