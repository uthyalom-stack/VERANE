import Link from "next/link";

export const dynamic = "force-dynamic";

async function getPageContent() {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const row = await prisma.siteSetting.findUnique({
      where: { key: "pageContent" },
    });

    await prisma.$disconnect();

    if (row?.value) {
      const pages = JSON.parse(row.value);

      if (Array.isArray(pages)) {
        const about = pages.find((page) => page.key === "about");
        return about?.content || "";
      }
    }
  } catch (error) {
    console.error("Failed to load About page:", error);
  }

  return "";
}

export default async function AboutPage() {
  const content = await getPageContent();

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/[0.07] blur-[120px]" />
          <div className="absolute bottom-[-200px] left-[-150px] h-[400px] w-[400px] rounded-full bg-white/[0.02] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              VÉRANE / ABOUT
            </span>
          </div>

          <div className="mt-10 max-w-5xl">
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-7xl lg:text-[100px]">
              More than
              <br />
              <span className="text-white/35">what you wear.</span>
            </h1>
          </div>

          <div className="mt-10 flex max-w-2xl items-start gap-5">
            <span className="mt-2 h-px w-8 shrink-0 bg-amber-400/60" />

            <p className="text-sm leading-7 text-white/40 sm:text-base">
              Two brands. One expression. A space where clothing,
              footwear and personal style come together.
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.35fr_0.65fr] lg:gap-20">
          {/* SIDE LABEL */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
              Our Story
            </p>

            <div className="mt-6 hidden h-px w-20 bg-white/10 lg:block" />
          </div>

          {/* ADMIN CONTENT */}
          <div className="min-w-0">
            {content ? (
              <div className="whitespace-pre-line text-base leading-8 text-white/65 sm:text-lg sm:leading-9">
                {content}
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-8 sm:p-10">
                <p className="text-sm leading-7 text-white/35">
                  Content coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BRAND STATEMENT */}
      <section className="border-y border-white/[0.08] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="grid gap-12 md:grid-cols-2 md:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
                The Expression
              </p>

              <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
                One identity.
                <br />
                <span className="text-white/35">Two worlds.</span>
              </h2>
            </div>

            <p className="max-w-lg text-sm leading-7 text-white/35 sm:text-base">
              VÉRANE brings UTHY LUXURY and ALOMZIEE FOOTIES together
              under one premium experience — giving you the freedom to
              build your expression your way.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="relative overflow-hidden rounded-[32px] border border-amber-400/10 bg-amber-400/[0.025] p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-amber-400/[0.06] blur-[100px]" />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
                Discover VÉRANE
              </p>

              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Find your expression.
              </h2>
            </div>

            <Link
              href="/catalog"
              className="group inline-flex w-fit items-center gap-4 rounded-full bg-amber-400 px-7 py-4 text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-amber-300 hover:shadow-[0_0_40px_rgba(245,185,66,0.12)]"
            >
              Explore Collection
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}