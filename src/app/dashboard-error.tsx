"use client";

import { useEffect } from "react";
import { signOut } from "./login/actions";

export function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center bg-[#f4f5f1] px-4 py-10 text-[#17201f]">
      <section className="mx-auto w-full max-w-xl" role="alert">
        <p className="text-xs font-bold tracking-wide text-[#53645f]">Masjid Al-Wasatiyah Wal-Itidaal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111817]">Dashboard unavailable</h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-[#53645f]">
          We could not load the current distribution data. Retry the request or sign out and start a new session.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-[#1f5d54] px-4 py-3 text-sm font-bold text-white shadow-sm"
            onClick={() => unstable_retry()}
            type="button"
          >
            Try again
          </button>
          <form action={signOut}>
            <button
              className="rounded-md border border-[#c9d3ce] bg-white px-4 py-3 text-sm font-bold text-[#26312f]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
