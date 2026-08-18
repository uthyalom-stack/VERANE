export const dynamic = "force-dynamic";

async function getContactContent() {
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
        const contact = pages.find((page) => page.key === "contact");
        return contact?.content || "";
      }
    }
  } catch (error) {
    console.error("Failed to load contact content:", error);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }

  return "";
}

async function getSettings() {
  let prisma;

  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();

    const rows = await prisma.siteSetting.findMany();

    const settings = {};

    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return settings;
  } catch (error) {
    console.error("Failed to load site settings:", error);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }

  return {};
}

export default async function ContactPage() {
  const [content, settings] = await Promise.all([
    getContactContent(),
    getSettings(),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/[0.07] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              VÉRANE / CONTACT
            </span>
          </div>

          <div className="mt-10 max-w-5xl">
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-7xl lg:text-[100px]">
              Let&apos;s
              <br />
              <span className="text-white/35">connect.</span>
            </h1>
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
            Questions, custom requests, collaborations or simply want to
            reach us? We&apos;re here.
          </p>
        </div>
      </section>

      {/* CONTACT CONTENT */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ADMIN CONTENT */}
          <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-7 sm:p-10 lg:p-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
              Get In Touch
            </p>

            <div className="mt-8">
              {content ? (
                <div className="whitespace-pre-line text-base leading-8 text-white/60 sm:text-lg sm:leading-9">
                  {content}
                </div>
              ) : (
                <p className="text-sm leading-7 text-white/35">
                  Contact information coming soon.
                </p>
              )}
            </div>
          </div>

          {/* CONTACT DETAILS */}
          <div className="space-y-4">
            <p className="mb-6 px-1 text-[10px] font-bold uppercase tracking-[0.35em] text-white/25">
              Contact Details
            </p>

            {settings.email && (
              <div className="group rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:border-amber-400/20 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/25">
                      Email
                    </p>

                    <a
                      href={`mailto:${settings.email}`}
                      className="mt-3 block break-all text-sm text-white/70 transition group-hover:text-white"
                    >
                      {settings.email}
                    </a>
                  </div>

                  <span className="text-lg text-white/20 transition group-hover:text-amber-400">
                    ↗
                  </span>
                </div>
              </div>
            )}

            {settings.phone && (
              <div className="group rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:border-amber-400/20 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/25">
                      Phone
                    </p>

                    <a
                      href={`tel:${settings.phone}`}
                      className="mt-3 block text-sm text-white/70 transition group-hover:text-white"
                    >
                      {settings.phone}
                    </a>
                  </div>

                  <span className="text-lg text-white/20 transition group-hover:text-amber-400">
                    ↗
                  </span>
                </div>
              </div>
            )}

            {settings.whatsapp && (
              <div className="group rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:border-amber-400/20 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/25">
                      WhatsApp
                    </p>

                    <a
                      href={`https://wa.me/${String(settings.whatsapp).replace(
                        /[^0-9]/g,
                        ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block text-sm text-white/70 transition group-hover:text-white"
                    >
                      {settings.whatsapp}
                    </a>
                  </div>

                  <span className="text-lg text-white/20 transition group-hover:text-amber-400">
                    ↗
                  </span>
                </div>
              </div>
            )}

            {!settings.email &&
              !settings.phone &&
              !settings.whatsapp && (
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
                  <p className="text-sm leading-7 text-white/30">
                    Contact details have not been configured yet.
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* BOTTOM STATEMENT */}
      <section className="border-y border-white/[0.08] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/70">
                VÉRANE
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Your expression starts here.
              </h2>
            </div>

            <div className="text-sm text-white/25">
              UTHY LUXURY × ALOMZIEE FOOTIES
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}