import Link from "next/link";
import { PrismaClient } from "@prisma/client";


import SiteFooter from "@/components/SiteFooter";

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
    subtitle: "",
    description:
      "UTHY LUXURY and ALOMZIEE FOOTIES. Clothing, footwear and accessories made for people who refuse to look ordinary.",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85",
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
    image:
      "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1800&q=85",
    mobileImage: "",
    buttonText: "Explore UTHY",
    buttonLink: "/catalog?brand=UTHY_LUXURY",
  },
  {
    key: "alomziee",
    enabled: true,
    title: "FROM THE GROUND UP.",
    subtitle: "ALOMZIEE FOOTIES",
    description:
      "Handmade footwear and accessories built with character Ã¢â‚¬â€ shoes, sandals, slides, boots, belts and bags.",
    image:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1800&q=85",
    mobileImage: "",
    buttonText: "Explore Alomziee",
    buttonLink: "/catalog?brand=ALOMZIEE_FOOTIES",
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
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
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
      "Two expressions. One philosophy. Pieces created with intention for people who don't want to look like everybody else.",
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85",
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
    const sections = await prisma.homepageSection.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    if (!sections.length) {
      return FALLBACK_SECTIONS;
    }

    return sections;
  } catch (error) {
    console.error("Homepage sections error:", error);
    return FALLBACK_SECTIONS;
  }
}

async function getProducts() {
  try {
    const products = await prisma.product.findMany({
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

function getProductImage(images) {
  if (!images) return null;

  try {
    if (Array.isArray(images)) {
      return images[0] || null;
    }

    if (typeof images === "string") {
      const parsed = JSON.parse(images);

      if (Array.isArray(parsed)) {
        return parsed[0] || null;
      }

      if (typeof parsed === "string") {
        return parsed;
      }
    }
  } catch {
    if (typeof images === "string") {
      const first = images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)[0];

      return first || null;
    }
  }

  return null;
}

function getBrandName(brand) {
  if (brand === "UTHY_LUXURY") {
    return "UTHY LUXURY";
  }

  if (brand === "ALOMZIEE_FOOTIES") {
    return "ALOMZIEE FOOTIES";
  }

  return brand || "VÃƒâ€°RANE";
}

function formatPrice(price) {
  const number = Number(price || 0);

  return `Ã¢â€šÂ¦${number.toLocaleString("en-NG")}`;
}

/* =========================================================
   SECTION IMAGE
========================================================= */

function SectionImage({ section, className = "" }) {
  if (!section?.image) return null;

  return (
    <picture>
      {section.mobileImage && (
        <source
          media="(max-width: 768px)"
          srcSet={section.mobileImage}
        />
      )}

      <img
        src={section.image}
        alt={section.title || "VÃƒâ€°RANE"}
        className={className}
      />
    </picture>
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({ product, featured = false }) {
  const image = getProductImage(product.images);

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group block snap-start shrink-0 ${
        featured
          ? "w-[72vw] sm:w-[42vw] md:w-[30vw] lg:w-[23vw]"
          : "w-[72vw] sm:w-[42vw] md:w-[30vw] lg:w-[23vw]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-950 mb-4 border border-white/[0.04]">

        {image ? (
          <img
            src={image}
            alt={product.name || "Product"}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <span className="text-5xl opacity-20">V</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute left-3 top-3">
          <span className="rounded-full border border-white/10 bg-black/60 backdrop-blur-md px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white/80">
            View
          </span>
        </div>
      </div>

      <p className="text-[9px] md:text-[10px] font-bold tracking-[0.18em] uppercase text-amber-400">
        {getBrandName(product.brand)}
      </p>

      <h3 className="font-semibold mt-1 text-sm md:text-base truncate">
        {product.name}
      </h3>

      <p className="text-neutral-400 text-sm mt-1">
        {formatPrice(product.price)}
      </p>
    </Link>
  );
}

/* =========================================================
   HORIZONTAL PRODUCT RAIL
========================================================= */

function ProductRail({
  products,
  emptyText = "No products available yet.",
}) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-950 px-6 py-16 text-center">
        <p className="text-sm text-neutral-500">
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
          pb-5
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
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[9px] uppercase tracking-[0.25em] text-white/20">
        <span className="h-px w-8 bg-white/10" />
        <span>Swipe to explore</span>
        <span className="text-white/10">Ã¢â€ â€™</span>
      </div>
    </div>
  );
}

/* =========================================================
   HOME PAGE
========================================================= */

export default async function HomePage() {
  const [sections, products] = await Promise.all([
    getHomepageSections(),
    getProducts(),
  ]);

  const getSection = (key) =>
    sections.find((section) => section.key === key);

  const hero = getSection("hero");
  const selected = getSection("selected-pieces");
  const uthy = getSection("uthy");
  const alomziee = getSection("alomziee");
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
    <main className="bg-black text-white overflow-hidden">





      {/* =====================================================
          HERO
      ===================================================== */}

      {hero?.enabled !== false && (
        <section className="relative min-h-screen flex items-center overflow-hidden">

          <div className="absolute inset-0">

            <SectionImage
              section={hero}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {!hero?.image && (
              <>
                <img
                  src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=85"
                  alt="Fashion"
                  className="absolute left-[-10%] top-[-5%] w-[65%] h-[110%] object-cover opacity-35"
                />

                <img
                  src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1400&q=85"
                  alt="Footwear"
                  className="absolute right-[-10%] top-[-5%] w-[60%] h-[110%] object-cover opacity-30"
                />
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-black" />

          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full py-32">

            <div className="max-w-5xl">

              {hero?.subtitle && (
                <p className="text-xs md:text-sm font-bold tracking-[0.5em] uppercase mb-7 text-amber-400">
                  {hero.subtitle}
                </p>
              )}

              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black leading-[0.85] tracking-[-0.06em]">
                {hero?.title || "TWO BRANDS. ONE EXPRESSION."}
              </h1>

              {hero?.description && (
                <p className="mt-8 max-w-xl text-neutral-300 text-base md:text-lg leading-relaxed">
                  {hero.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-10">

                {hero?.buttonText && (
                  <Link
                    href={hero.buttonLink || "/catalog"}
                    className="px-8 py-4 rounded-full bg-amber-500 text-black font-bold text-sm uppercase tracking-wider text-center hover:bg-amber-400 transition"
                  >
                    {hero.buttonText}
                  </Link>
                )}

                {hero?.secondaryButtonText && (
                  <Link
                    href={
                      hero.secondaryButtonLink ||
                      "/outfit-builder"
                    }
                    className="border border-white/30 backdrop-blur-md px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider text-center hover:bg-white hover:text-black transition"
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
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-28">

          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-5">

            <div>
              {selected.subtitle && (
                <p className="text-xs font-bold tracking-[0.35em] uppercase mb-4 text-amber-400">
                  {selected.subtitle}
                </p>
              )}

              <h2 className="text-4xl md:text-6xl font-black tracking-tight">
                {selected.title}
              </h2>
            </div>

            {selected.buttonText && (
              <Link
                href={selected.buttonLink || "/catalog"}
                className="text-sm font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition"
              >
                {selected.buttonText} Ã¢â€ â€™
              </Link>
            )}

          </div>

          <ProductRail
            products={selectedProducts}
            emptyText="Products will appear here once you add them from the admin."
          />

        </section>
      )}

      {/* =====================================================
          UTHY LUXURY
      ===================================================== */}

      {uthy?.enabled !== false && (
        <>

          <section className="relative min-h-[75vh] flex items-center overflow-hidden border-y border-white/5">

            <SectionImage
              section={uthy}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {!uthy?.image && (
              <div className="absolute inset-0 bg-neutral-900" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-transparent" />

            <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full">

              <div className="max-w-xl">

                {uthy.subtitle && (
                  <p className="text-xs font-bold tracking-[0.4em] uppercase mb-5 text-amber-400">
                    {uthy.subtitle}
                  </p>
                )}

                <h2 className="text-5xl md:text-7xl font-black leading-[0.9]">
                  {uthy.title}
                </h2>

                {uthy.description && (
                  <p className="text-neutral-300 mt-7 leading-relaxed max-w-md">
                    {uthy.description}
                  </p>
                )}

                {uthy.buttonText && (
                  <Link
                    href={
                      uthy.buttonLink ||
                      "/catalog?brand=UTHY_LUXURY"
                    }
                    className="inline-block mt-8 bg-white text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
                  >
                    {uthy.buttonText}
                  </Link>
                )}

              </div>
            </div>
          </section>

          {/* UTHY PRODUCTS */}

          <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">

            <div className="flex justify-between items-center mb-8">

              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-2">
                  UTHY LUXURY
                </p>

                <h3 className="text-2xl md:text-3xl font-black">
                  From UTHY
                </h3>
              </div>

              <Link
                href="/catalog?brand=UTHY_LUXURY"
                className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
              >
                Shop all Ã¢â€ â€™
              </Link>

            </div>

            <ProductRail
              products={uthyProducts}
              emptyText="UTHY products will appear here once you add them."
            />

          </section>

        </>
      )}

      {/* =====================================================
          ALOMZIEE FOOTIES
      ===================================================== */}

      {alomziee?.enabled !== false && (
        <>

          <section className="relative min-h-[75vh] flex items-center overflow-hidden border-y border-white/5">

            <SectionImage
              section={alomziee}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {!alomziee?.image && (
              <div className="absolute inset-0 bg-neutral-900" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

            <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full">

              <div className="max-w-xl">

                {alomziee.subtitle && (
                  <p className="text-xs font-bold tracking-[0.4em] uppercase mb-5 text-amber-400">
                    {alomziee.subtitle}
                  </p>
                )}

                <h2 className="text-5xl md:text-7xl font-black leading-[0.9]">
                  {alomziee.title}
                </h2>

                {alomziee.description && (
                  <p className="text-neutral-300 mt-7 leading-relaxed max-w-md">
                    {alomziee.description}
                  </p>
                )}

                {alomziee.buttonText && (
                  <Link
                    href={
                      alomziee.buttonLink ||
                      "/catalog?brand=ALOMZIEE_FOOTIES"
                    }
                    className="inline-block mt-8 bg-white text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
                  >
                    {alomziee.buttonText}
                  </Link>
                )}

              </div>
            </div>
          </section>

          {/* ALOMZIEE PRODUCTS */}

          <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">

            <div className="flex justify-between items-center mb-8">

              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-2">
                  ALOMZIEE FOOTIES
                </p>

                <h3 className="text-2xl md:text-3xl font-black">
                  From Alomziee
                </h3>
              </div>

              <Link
                href="/catalog?brand=ALOMZIEE_FOOTIES"
                className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
              >
                Shop all Ã¢â€ â€™
              </Link>

            </div>

            <ProductRail
              products={alomzieeProducts}
              emptyText="ALOMZIEE products will appear here once you add them."
            />

          </section>

        </>
      )}

      {/* =====================================================
          OUTFIT BUILDER
      ===================================================== */}

      {outfit?.enabled !== false && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-28">

          <div className="rounded-[2rem] bg-neutral-950 border border-white/10 overflow-hidden">

            <div className="grid md:grid-cols-2 min-h-[600px]">

              <div className="relative flex items-center justify-center bg-gradient-to-b from-neutral-900 to-black p-10">

                <div className="relative w-56 h-[430px]">

                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-neutral-700 border border-white/10" />

                  <div className="absolute top-20 left-1/2 -translate-x-1/2 w-40 h-64 rounded-[45%] bg-neutral-800 border border-white/10" />

                  <div className="absolute top-36 left-1/2 -translate-x-[105%] w-14 h-52 rounded-full bg-neutral-800 rotate-[8deg] border border-white/10" />

                  <div className="absolute top-36 left-1/2 translate-x-[5%] w-14 h-52 rounded-full bg-neutral-800 -rotate-[8deg] border border-white/10" />

                  <div className="absolute top-[265px] left-1/2 -translate-x-[95%] w-16 h-40 rounded-full bg-neutral-800 border border-white/10" />

                  <div className="absolute top-[265px] left-1/2 translate-x-[0%] w-16 h-40 rounded-full bg-neutral-800 border border-white/10" />

                </div>
              </div>

              <div className="p-8 md:p-14 flex flex-col justify-center">

                {outfit.subtitle && (
                  <p className="text-xs font-bold tracking-[0.35em] uppercase mb-5 text-amber-400">
                    {outfit.subtitle}
                  </p>
                )}

                <h2 className="text-4xl md:text-6xl font-black leading-none">
                  {outfit.title}
                </h2>

                {outfit.description && (
                  <p className="text-neutral-400 mt-6 leading-relaxed max-w-md">
                    {outfit.description}
                  </p>
                )}

                <div className="grid grid-cols-4 gap-2 mt-10">

                  {[
                    "TOP",
                    "BOTTOM",
                    "SHOES",
                    "ACCESSORIES",
                  ].map((item) => (
                    <div
                      key={item}
                      className="border border-white/10 rounded-xl p-3 text-center"
                    >
                      <div className="aspect-square bg-neutral-900 rounded-lg mb-2" />

                      <p className="text-[8px] tracking-wider text-neutral-500">
                        {item}
                      </p>
                    </div>
                  ))}

                </div>

                {outfit.buttonText && (
                  <Link
                    href={
                      outfit.buttonLink ||
                      "/outfit-builder"
                    }
                    className="mt-8 inline-block px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-center bg-amber-500 text-black hover:bg-amber-400 transition"
                  >
                    {outfit.buttonText} Ã¢â€ â€™
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
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">

          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">

            <div>

              {arrivals.subtitle && (
                <p className="text-xs font-bold tracking-[0.35em] uppercase mb-4 text-amber-400">
                  {arrivals.subtitle}
                </p>
              )}

              <h2 className="text-4xl md:text-6xl font-black">
                {arrivals.title}
              </h2>

            </div>

            {arrivals.buttonText && (
              <Link
                href={arrivals.buttonLink || "/catalog"}
                className="mt-5 md:mt-0 text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
              >
                {arrivals.buttonText} Ã¢â€ â€™
              </Link>
            )}

          </div>

          <ProductRail
            products={newArrivals}
            emptyText="New arrivals will appear here once you add products."
          />

        </section>
      )}

      {/* =====================================================
          STORY
      ===================================================== */}

      {story?.enabled !== false && (
        <section className="relative min-h-[70vh] flex items-center justify-center text-center mt-20">

          <SectionImage
            section={story}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {!story?.image && (
            <div className="absolute inset-0 bg-neutral-900" />
          )}

          <div className="absolute inset-0 bg-black/65" />

          <div className="relative z-10 max-w-2xl px-5">

            {story.subtitle && (
              <p className="text-xs font-bold tracking-[0.4em] uppercase mb-6 text-amber-400">
                {story.subtitle}
              </p>
            )}

            <h2 className="text-4xl md:text-7xl font-black leading-none">
              {story.title}
            </h2>

            {story.description && (
              <p className="text-neutral-300 mt-7 leading-relaxed">
                {story.description}
              </p>
            )}

            {story.buttonText && (
              <Link
                href={story.buttonLink || "/about"}
                className="inline-block mt-8 border border-white/30 px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-white hover:text-black transition"
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
            <p className="text-xs font-bold tracking-[0.35em] uppercase mb-5 text-amber-400">
              {newsletter.subtitle}
            </p>
          )}

          <h2 className="text-3xl md:text-5xl font-black">
            {newsletter.title}
          </h2>

          {newsletter.description && (
            <p className="text-neutral-400 mt-4 mb-8">
              {newsletter.description}
            </p>
          )}

          <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" action="/api/subscribe" method="POST">
  <input type="email" name="email" placeholder="Your email address" required className="flex-1 bg-neutral-900 border border-white/10 rounded-full px-5 py-4 text-sm outline-none focus:border-amber-500 transition" />
  <button type="submit" className="px-7 py-4 rounded-full font-bold text-sm bg-amber-500 text-black hover:bg-amber-400 transition">
    {newsletter.buttonText || "Subscribe"}
  </button>
</form>
        </section>
      )}

      <SiteFooter />

    </main>
  );
}



