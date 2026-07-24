const statPlaceholders = Array.from({ length: 6 }, (_, index) => index);
const rowPlaceholders = Array.from({ length: 5 }, (_, index) => index);

export function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading distribution dashboard"
      className="min-h-screen bg-[#f4f5f1] text-[#17201f]"
      role="status"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="border-b border-[#d8ded7] px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-wide text-[#53645f]">Masjid Al-Wasatiyah Wal-Itidaal</p>
          <div className="mt-2 h-8 w-full max-w-sm rounded-md bg-[#dfe5e1] motion-safe:animate-pulse" />
          <div className="mt-3 h-4 w-full max-w-xs rounded-md bg-[#e5e9e5] motion-safe:animate-pulse" />
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {statPlaceholders.map((item) => (
                <div
                  className="h-20 rounded-md border border-[#d8ded7] bg-white motion-safe:animate-pulse"
                  key={item}
                />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-lg border border-[#d8ded7] bg-white">
                <div className="h-16 border-b border-[#e3e8e4] bg-[#f8faf8] motion-safe:animate-pulse" />
                <div className="p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="h-16 rounded-md bg-[#e5e9e5] motion-safe:animate-pulse" />
                    <div className="h-16 rounded-md bg-[#e5e9e5] motion-safe:animate-pulse" />
                  </div>
                  <div className="mt-4 divide-y divide-[#edf0ed] border-y border-[#edf0ed]">
                    {rowPlaceholders.map((item) => (
                      <div className="h-16 bg-white motion-safe:animate-pulse" key={item} />
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid content-start gap-5">
                {rowPlaceholders.slice(0, 3).map((item) => (
                  <div
                    className="h-40 rounded-lg border border-[#d8ded7] bg-white motion-safe:animate-pulse"
                    key={item}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
