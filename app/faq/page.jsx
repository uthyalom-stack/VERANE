export const dynamic = "force-dynamic";

async function getFaqContent() {
  let prisma;

  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();

    const row = await prisma.siteSetting.findUnique({
      where: { key: "pageContent" },
    });

    if (row?.value) {
      const pages = JSON.parse(row.value);

      if (Array.isArray(pages)) {
        const faq = pages.find((page) => page.key === "faq");
        return faq?.content || "";
      }
    }
  } catch (error) {
    console.error("Failed to load FAQ content:", error);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }

  return "";
}

export default async function FaqPage() {
  const content = await getFaqContent();

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/[0.07] blur-[120px]" />

          <div className="absolute right-[-150px] top-[200px] h-[300px] w-[300px] rounded-full bg-white/[0.02] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              VÉRANE / FAQ
            </span>
          </div>

          <div className="mt-10 max-w-5xl">
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-7xl lg:text-[100px]">
              Questions.
              <br />
              <span className="text-white/35">Answered.</span>
            </h1>
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
            Everything you need to know about the VÉRANE experience.
          </p>
        </div>
      </section>

      {/* FAQ CONTENT */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.3fr_0.7fr] lg:gap-20">
          {/* SIDE */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
              Information
            </p>

            <div className="mt-6 hidden h-px w-16 bg-white/10 lg:block" />

            <p className="mt-6 max-w-xs text-sm leading-7 text-white/25">
              Find answers to common questions about our products,
              ordering experience and services.
            </p>
          </div>

          {/* CONTENT */}
          <div>
            {content ? (
              <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-7 sm:p-10">
                <div className="whitespace-pre-line text-sm leading-8 text-white/60 sm:text-base sm:leading-9">
                  {content}
                </div>
              </div>
            ) : (
              <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-8 sm:p-12">
                <div className="flex items-start gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.05] text-sm text-amber-400">
                    ?
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      Frequently asked questions
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-white/30">
                      Frequently asked questions are coming soon. Check back
                      shortly for more information about VÉRANE.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BRAND STRIP */}
      <section className="border-y border-white/[0.08] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
                VÉRANE
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Two brands.
                <br />
                <span className="text-white/35">One expression.</span>
              </h2>
            </div>

            <div className="md:text-right">
              <p className="text-sm uppercase tracking-[0.2em] text-white/20">
                UTHY LUXURY
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/20">
                ×
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/20">
                ALOMZIEE FOOTIES
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}