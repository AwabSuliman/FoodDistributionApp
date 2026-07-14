import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { getAuthenticatedProfile, getSupabaseConfig, safeRedirectPath } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; next?: string }> }) {
  const config = getSupabaseConfig();
  const profile = await getAuthenticatedProfile();
  const params = await searchParams;
  const nextPath = safeRedirectPath(params?.next);

  if (config && profile) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center bg-[#f4f5f1] px-4 py-10 text-[#17201f]">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
        <section>
          <p className="text-xs font-bold tracking-wide text-[#53645f]">Masjid Al-Wasatiyah Wal-Itidaal</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-[#111817] sm:text-4xl">
            Zakatul Fitr Distribution
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#53645f]">
            Sign in with Supabase authentication to manage requests, driver approvals, and delivery progress.
          </p>
          {!config && (
            <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              Supabase authentication is ready in code, but the project needs `NEXT_PUBLIC_SUPABASE_URL` and
              `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` before sign-in can work.
            </div>
          )}
          {params?.error && (
            <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">
              {params.error}
            </div>
          )}
          <Link className="mt-5 inline-flex text-sm font-bold text-[#1f5d54]" href="/dashboard">
            View local demo dashboard
          </Link>
        </section>
        <AuthForm nextPath={nextPath} />
      </div>
    </main>
  );
}
