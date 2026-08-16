export default function SubscribersPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 md:py-14">
        <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em]">
          VÉRANE ADMIN
        </p>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3">
          Subscribers
        </h1>

        <p className="text-neutral-500 mt-3">
          Manage your VÉRANE community and newsletter subscribers.
        </p>

        <div className="mt-10 rounded-3xl border border-white/10 bg-neutral-950 p-10 md:p-16 text-center">
          <div className="w-16 h-16 rounded-full border border-white/10 mx-auto flex items-center justify-center text-2xl">
            ◎
          </div>

          <h2 className="text-xl font-bold mt-5">
            No subscribers yet
          </h2>

          <p className="text-sm text-neutral-600 mt-2">
            Newsletter subscribers will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}