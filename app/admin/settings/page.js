export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 md:py-14">
        <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em]">
          VÉRANE ADMIN
        </p>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3">
          Settings
        </h1>

        <p className="text-neutral-500 mt-3">
          Configure your VÉRANE store.
        </p>

        <div className="mt-10 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-600">
              Store
            </p>

            <h2 className="font-bold mt-2">
              VÉRANE
            </h2>

            <p className="text-sm text-neutral-500 mt-1">
              UTHY LUXURY × ALOMZIEE FOOTIES
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-600">
              Status
            </p>

            <div className="flex items-center gap-2 mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />

              <span className="text-sm text-emerald-400">
                Store system online
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}