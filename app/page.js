import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import SiteFooter from "@/components/SiteFooter";
import StorefrontProductCard from "@/components/storefront/ProductCard";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const FALLBACK_SECTIONS = [
  {
    key: "hero",
    enabled: true,
    title: "TWO BRANDS. ONE EXPRESSION.",
    subtitle: "VÉRANE ATELIER",
    description:
      "UTHY LUXURY and ALOMZIEE FOOTIES. Clothing, footwear and accessories made for people who refuse to look ordinary.",
    image: "",
    mobileImage: "",
    buttonText: "Explore Collection",
    buttonLink: "/catalog",
    secondaryButtonText: "Build Your Look",
    secondaryButtonLink: "/outfit-builder",
  },
  {
    key: "selected-pieces",
    enabled: true,
    title: "Selected Pieces",
    subtitle: "Curated for you",
    description: "",
    image: "",
    mobileImage: "",
    buttonText: "View Collection",
    buttonLink: "/catalog",
  },
  {
    key: "uthy",
    enabled: true,
    title: "CLOTHED DIFFERENTLY.",
    subtitle: "UTHY LUXURY",
    description:
      "Custom shirts, tailored trousers, hoodies and traditional pieces crafted to give your wardrobe its own identity.",
    image: "",
    mobileImage: "",
    buttonText: "Explore UTHY",
    buttonLink: "/uthy",
  },
  {
    key: "alomziee",
    enabled: true,
    title: "FROM THE GROUND UP.",
    subtitle: "ALOMZIEE FOOTIES",
    description:
      "Handmade footwear and accessories built with character - shoes, sandals, slides, boots, belts and bags.",
    image: "",
    mobileImage: "",
    buttonText: "Explore Alomziee",
    buttonLink: "/alomziee",
  },
  {
    key: "collaborations",
    enabled: true,
    title: "UTHY × ALOMZIEE.",
    subtitle: "EXCLUSIVE EDITIONS",
    description:
      "Garments from UTHY LUXURY and footwear from ALOMZIEE FOOTIES crafted in unison. Co-created capsule collections designed to be worn together.",
    image: "",
    mobileImage: "",
    buttonText: "Explore Collaborations",
    buttonLink: "/collaborations",
  },
  {
    key: "outfit-builder",
    enabled: true,
    title: "BUILD YOUR LOOK.",
    subtitle: "Your wardrobe. Your rules.",
    description:
      "Mix UTHY clothing with ALOMZIEE footwear and accessories. Build the outfit in real time and see the complete look before you buy.",
    image: "",
    mobileImage: "",
    buttonText: "Enter Outfit Builder",
    buttonLink: "/outfit-builder",
  },
  {
    key: "new-arrivals",
    enabled: true,
    title: "New Arrivals",
    subtitle: "Just dropped",
    description: "",
    image: "",
    mobileImage: "",
    buttonText: "View Everything",
    buttonLink: "/catalog",
  },
  {
    key: "story",
    enabled: true,
    title: "CRAFTED WITH INTENTION.",
    subtitle: "The philosophy",
    description:
      "Two expressions. One philosophy. Pieces created with intention for people who do not want to look like everybody else.",
    image: "",
    mobileImage: "",
    buttonText: "Discover the Story",
    buttonLink: "/about",
  },
  {
    key: "newsletter",
    enabled: true,
    title: "JOIN THE LIST.",
    subtitle: "Stay close",
    description:
      "New drops, exclusive pieces and early access.",
    image: "",
    mobileImage: "",
    buttonText: "Subscribe",
    buttonLink: "",
  },
];

/* =========================================================
   HOMEPAGE DATA
========================================================= */

async function getHomepageSections() {
  try {
    const dbSections = await prisma.homepageSection.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    const dbMap = new Map(dbSections.map((s) => [s.key, s]));

    const mergedSections = FALLBACK_SECTIONS.map((fallback) => {
      const dbSec = dbMap.get(fallback.key);
      if (dbSec) {
        return {
          ...fallback,
          ...dbSec,
        };
      }
      return fallback;
    });

    dbSections.forEach((dbSec) => {
      if (!FALLBACK_SECTIONS.some((f) => f.key === dbSec.key)) {
        mergedSections.push(dbSec);
      }
    });

    return mergedSections;
  } catch (error) {
    console.error("Homepage sections error:", error);
    return FALLBACK_SECTIONS;
  }
}

async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return products;
  } catch (error) {
    console.error("Homepage products error:", error);
    return [];
  }
}

/* =========================================================
   HELPERS
========================================================= */

function hasSectionImage(section) {
  return Boolean(section?.image?.trim() || section?.mobileImage?.trim());
}

function SectionImage({ section, className = "" }) {
  const desktopImg = section?.image?.trim();
  const mobileImg = section?.mobileImage?.trim();

  if (!desktopImg && !mobileImg) return null;

  const primarySrc = desktopImg || mobileImg;

  return (
    <picture className="contents">
      {mobileImg && (
        <source
          media="(max-width: 768px)"
          srcSet={mobileImg}
        />
      )}

      <img
        src={primarySrc}
        alt={section?.title || "VÉRANE"}
        className={className}
      />
    </picture>
  );
}

/* =========================================================
   HORIZONTAL PRODUCT RAIL
========================================================= */

function ProductRail({
  products,
  variantMode = "standard",
  emptyText = "No products available yet.",
}) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 px-6 py-16 text-center">
        <p className="text-sm font-light text-neutral-500">
          {emptyText}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="
          flex
          gap-4
          md:gap-6
          overflow-x-auto
          snap-x
          snap-mandatory
          pb-6
          pr-5
          scrollbar-hide
          overscroll-x-contain
        "
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="shrink-0 snap-start w-[72vw] sm:w-[42vw] md:w-[30vw] lg:w-[23vw]"
          >
            <StorefrontProductCard
              product={product}
              variant={variantMode}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[9px] uppercase tracking-luxury text-neutral-500">
        <span className="h-px w-8 bg-amber-400/40" />
        <span>Swipe to explore atelier pieces</span>
        <span className="text-amber-400">→</span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [sections, products] = await Promise.all([
    getHomepageSections(),
    getProducts(),
  ]);

  const getSection = (key) => {
    const found = sections.find((section) => section.key === key);
    if (found) return found;
    return FALLBACK_SECTIONS.find((s) => s.key === key) || null;
  };

  const hero = getSection("hero");
  const selected = getSection("selected-pieces");
  const uthy = getSection("uthy");
  const alomziee = getSection("alomziee");
  const collaborationsSection = getSection("collaborations");
  const outfit = getSection("outfit-builder");
  const arrivals = getSection("new-arrivals");
  const story = getSection("story");
  const newsletter = getSection("newsletter");

  const selectedProducts = products.slice(0, 8);

  const uthyProducts = products.filter(
    (product) => product.brand === "UTHY_LUXURY"
  );

  const alomzieeProducts = products.filter(
    (product) => product.brand === "ALOMZIEE_FOOTIES"
  );

  const newArrivals = products.slice(0, 8);

  return (
    <main className="bg-[#070707] text-[#f5f5f5] overflow-hidden">

      {/* =====================================================
          HERO
      ===================================================== */}

      {hero?.enabled !== false && (
        <section className="relative min-h-screen flex items-center overflow-hidden border-b border-white/[0.08]">
          <div className="absolute inset-0">
            <SectionImage
              section={hero}
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-[#070707]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full py-36">
            <div className="max-w-4xl">

              <div className="flex items-center gap-3 mb-6">
                <span className="h-px w-8 bg-amber-400" />
                <p className="text-[10px] font-bold tracking-couture uppercase text-amber-400">
                  {hero?.subtitle || "VÉRANE ATELIER"}
                </p>
              </div>

              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem] font-editorial font-light leading-[0.85] tracking-tight text-white">
                {hero?.title || "TWO BRANDS. ONE EXPRESSION."}
              </h1>

              {hero?.description && (
                <p className="mt-8 max-w-xl text-neutral-300 font-light text-base md:text-lg leading-relaxed">
                  {hero.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-12">
                {hero?.buttonText && (
                  <Link
                    href={hero.buttonLink || "/catalog"}
                    className="px-9 py-4 rounded-full bg-amber-400 text-black font-bold text-xs uppercase tracking-luxury text-center hover:bg-amber-300 transition shadow-xl shadow-amber-400/10"
                  >
                    {hero.buttonText} →
                  </Link>
                )}

                {hero?.secondaryButtonText && (
                  <Link
                    href={hero.secondaryButtonLink || "/outfit-builder"}
                    className="border border-white/20 backdrop-blur-md px-9 py-4 rounded-full font-bold text-xs uppercase tracking-luxury text-center text-white hover:bg-white hover:text-black transition"
                  >
                    {hero.secondaryButtonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          SELECTED PIECES
      ===================================================== */}

      {selected?.enabled !== false && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-5 border-b border-white/[0.06] pb-6">
            <div>
              {selected?.subtitle && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-px w-6 bg-amber-400" />
                  <p className="text-[9px] font-bold tracking-couture uppercase text-amber-400">
                    {selected?.subtitle}
                  </p>
                </div>
              )}

              <h2 className="text-3xl sm:text-5xl font-editorial font-light tracking-tight text-white">
                {selected?.title}
              </h2>
            </div>

            {selected?.buttonText && (
              <Link
                href={selected?.buttonLink || "/catalog"}
                className="text-xs font-bold uppercase tracking-luxury text-amber-400/90 hover:text-amber-300 transition"
              >
                {selected?.buttonText} →
              </Link>
            )}
          </div>

          <ProductRail
            products={selectedProducts}
            variantMode="standard"
            emptyText="Products will appear here once added from the admin."
          />
        </section>
      )}

      {/* =====================================================
          UTHY LUXURY
      ===================================================== */}

      {uthy?.enabled !== false && (
        <>
          <section className="relative min-h-[75vh] flex items-center overflow-hidden border-y border-white/[0.08]">
            <SectionImage
              section={uthy}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {!hasSectionImage(uthy) && (
              <div className="absolute inset-0 bg-neutral-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />

            <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full py-20">
              <div className="max-w-xl">

                {uthy.subtitle && (
                  <p className="text-[10px] font-bold tracking-couture uppercase mb-4 text-amber-400">
                    {uthy.subtitle}
                  </p>
                )}

                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-editorial font-light leading-[0.9] text-white">
                  {uthy.title}
                </h2>

                {uthy.description && (
                  <p className="text-neutral-300 font-light mt-6 leading-relaxed">
                    {uthy.description}
                  </p>
                )}

                {uthy.buttonText && (
                  <Link
                    href={uthy.buttonLink || "/catalog?brand=UTHY_LUXURY"}
                    className="inline-block mt-8 bg-white text-black px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-luxury hover:bg-amber-400 transition shadow-lg"
                  >
                    {uthy.buttonText} →
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-20">
            <div className="flex justify-between items-center mb-8 border-b border-white/[0.06] pb-4">
              <div>
                <p className="text-[9px] font-bold tracking-couture uppercase text-amber-400 mb-1">
                  UTHY LUXURY SELECTION
                </p>

                <h3 className="text-2xl sm:text-3xl font-editorial font-light text-white">
                  Curated Garments
                </h3>
              </div>

              <Link
                href="/catalog?brand=UTHY_LUXURY"
                className="text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition"
              >
                Shop UTHY →
              </Link>
            </div>

            <ProductRail
              products={uthyProducts}
              variantMode="uthy"
              emptyText="UTHY products will appear here once added."
            />
          </section>
        </>
      )}

      {/* =====================================================
          ALOMZIEE FOOTIES
      ===================================================== */}

      {alomziee?.enabled !== false && (
        <>
          <section className="relative min-h-[75vh] flex items-center overflow-hidden border-y border-white/[0.08]">
            <SectionImage
              section={alomziee}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {!hasSectionImage(alomziee) && (
              <div className="absolute inset-0 bg-neutral-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />

            <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full py-20">
              <div className="max-w-xl">

                {alomziee.subtitle && (
                  <p className="text-[10px] font-bold tracking-couture uppercase mb-4 text-amber-400">
                    {alomziee.subtitle}
                  </p>
                )}

                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-editorial font-light leading-[0.9] text-white">
                  {alomziee.title}
                </h2>

                {alomziee.description && (
                  <p className="text-neutral-300 font-light mt-6 leading-relaxed">
                    {alomziee.description}
                  </p>
                )}

                {alomziee.buttonText && (
                  <Link
                    href={
                      alomziee.buttonLink ||
                      "/catalog?brand=ALOMZIEE_FOOTIES"
                    }
                    className="inline-block mt-8 bg-white text-black px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-luxury hover:bg-amber-400 transition shadow-lg"
                  >
                    {alomziee.buttonText} →
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-20">
            <div className="flex justify-between items-center mb-8 border-b border-white/[0.06] pb-4">
              <div>
                <p className="text-[9px] font-bold tracking-couture uppercase text-amber-400 mb-1">
                  ALOMZIEE FOOTIES SELECTION
                </p>

                <h3 className="text-2xl sm:text-3xl font-editorial font-light text-white">
                  Handcrafted Footwear
                </h3>
              </div>

              <Link
                href="/catalog?brand=ALOMZIEE_FOOTIES"
                className="text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition"
              >
                Shop Alomziee →
              </Link>
            </div>

            <ProductRail
              products={alomzieeProducts}
              variantMode="alomziee"
              emptyText="ALOMZIEE products will appear here once added."
            />
          </section>
        </>
      )}

      {/* =====================================================
          COLLABORATIONS
      ===================================================== */}

      {collaborationsSection?.enabled !== false && (
        <section className="relative min-h-[65vh] flex items-center overflow-hidden border-y border-white/[0.08] my-12">
          <SectionImage
            section={collaborationsSection}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {!hasSectionImage(collaborationsSection) && (
            <div className="absolute inset-0 bg-neutral-950" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full py-20">
            <div className="max-w-xl">
              {collaborationsSection.subtitle && (
                <p className="text-[10px] font-bold tracking-couture uppercase mb-4 text-amber-400">
                  {collaborationsSection.subtitle}
                </p>
              )}

              <h2 className="text-4xl sm:text-6xl font-editorial font-light leading-[0.9] text-white">
                {collaborationsSection.title}
              </h2>

              {collaborationsSection.description && (
                <p className="text-neutral-300 font-light mt-6 leading-relaxed">
                  {collaborationsSection.description}
                </p>
              )}

              {collaborationsSection.buttonText && (
                <Link
                  href={collaborationsSection.buttonLink || "/collaborations"}
                  className="inline-block mt-8 bg-amber-400 text-black px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-luxury hover:bg-amber-300 transition shadow-xl shadow-amber-400/10"
                >
                  {collaborationsSection.buttonText} →
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          OUTFIT BUILDER
      ===================================================== */}

      {outfit?.enabled !== false && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-24">
          <div className="rounded-3xl bg-neutral-950/80 border border-white/[0.08] overflow-hidden backdrop-blur-md">
            <div className="grid md:grid-cols-2 min-h-[500px]">

              <div className="relative flex items-center justify-center bg-gradient-to-b from-neutral-900 to-black p-8">
                <div className="relative w-48 h-[360px]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-neutral-800 border border-white/10" />
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-36 h-56 rounded-[45%] bg-neutral-800/80 border border-white/10" />
                  <div className="absolute top-28 left-1/2 -translate-x-[105%] w-12 h-44 rounded-full bg-neutral-800 rotate-[8deg] border border-white/10" />
                  <div className="absolute top-28 left-1/2 translate-x-[5%] w-12 h-44 rounded-full bg-neutral-800 -rotate-[8deg] border border-white/10" />
                </div>
              </div>

              <div className="p-8 lg:p-14 flex flex-col justify-center">

                {outfit.subtitle && (
                  <p className="text-[10px] font-bold tracking-couture uppercase mb-3 text-amber-400">
                    {outfit.subtitle}
                  </p>
                )}

                <h2 className="text-3xl sm:text-5xl font-editorial font-light text-white leading-tight">
                  {outfit.title}
                </h2>

                {outfit.description && (
                  <p className="text-neutral-400 font-light mt-4 leading-relaxed">
                    {outfit.description}
                  </p>
                )}

                {outfit.buttonText && (
                  <Link
                    href={outfit.buttonLink || "/outfit-builder"}
                    className="mt-8 inline-block px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-luxury text-center bg-amber-400 text-black hover:bg-amber-300 transition shadow-xl shadow-amber-400/10"
                  >
                    {outfit.buttonText} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          NEW ARRIVALS
      ===================================================== */}

      {arrivals?.enabled !== false && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-white/[0.06] pb-4">

            <div>
              {arrivals.subtitle && (
                <p className="text-[9px] font-bold tracking-couture uppercase mb-2 text-amber-400">
                  {arrivals.subtitle}
                </p>
              )}

              <h2 className="text-3xl sm:text-5xl font-editorial font-light text-white">
                {arrivals.title}
              </h2>
            </div>

            {arrivals.buttonText && (
              <Link
                href={arrivals.buttonLink || "/catalog"}
                className="mt-4 md:mt-0 text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition"
              >
                {arrivals.buttonText} →
              </Link>
            )}
          </div>

          <ProductRail
            products={newArrivals}
            variantMode="standard"
            emptyText="New arrivals will appear here once products are added."
          />
        </section>
      )}

      {/* =====================================================
          STORY
      ===================================================== */}

      {story?.enabled !== false && (
        <section className="relative min-h-[65vh] flex items-center justify-center text-center mt-16 border-y border-white/[0.08]">

          <SectionImage
            section={story}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {!hasSectionImage(story) && (
            <div className="absolute inset-0 bg-neutral-950" />
          )}

          <div className="absolute inset-0 bg-black/75" />

          <div className="relative z-10 max-w-2xl px-5">

            {story.subtitle && (
              <p className="text-[10px] font-bold tracking-couture uppercase mb-4 text-amber-400">
                {story.subtitle}
              </p>
            )}

            <h2 className="text-4xl sm:text-6xl font-editorial font-light text-white leading-tight">
              {story.title}
            </h2>

            {story.description && (
              <p className="text-neutral-300 font-light mt-6 leading-relaxed">
                {story.description}
              </p>
            )}

            {story.buttonText && (
              <Link
                href={story.buttonLink || "/about"}
                className="inline-block mt-8 border border-white/20 px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-luxury text-white hover:bg-white hover:text-black transition"
              >
                {story.buttonText}
              </Link>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          NEWSLETTER
      ===================================================== */}

      {newsletter?.enabled !== false && (
        <section className="max-w-3xl mx-auto px-5 py-28 text-center">

          {newsletter.subtitle && (
            <p className="text-[10px] font-bold tracking-couture uppercase mb-3 text-amber-400">
              {newsletter.subtitle}
            </p>
          )}

          <h2 className="text-3xl sm:text-5xl font-editorial font-light text-white">
            {newsletter.title}
          </h2>

          {newsletter.description && (
            <p className="text-neutral-400 font-light text-sm mt-4 mb-8">
              {newsletter.description}
            </p>
          )}

          <form
            className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            action="/api/subscribe"
            method="POST"
          >
            <input
              type="email"
              name="email"
              placeholder="Your email address"
              required
              className="flex-1 bg-neutral-900/90 border border-white/10 rounded-full px-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-400/50 transition"
            />

            <button
              type="submit"
              className="px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-luxury bg-amber-400 text-black hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
            >
              {newsletter.buttonText || "Subscribe"}
            </button>
          </form>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
