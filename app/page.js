import Link from "next/link";
import { PrismaClient } from "@prisma/client";

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
      "Handmade footwear and accessories built with character — shoes, sandals, slides, boots, belts and bags.",
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

const PRODUCTS = [
  {
    name: "Signature Shirt",
    brand: "UTHY LUXURY",
    category: "Shirts",
    price: "₦45,000",
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Classic Tailored Trouser",
    brand: "UTHY LUXURY",
    category: "Trousers",
    price: "₦35,000",
    image:
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Handcrafted Leather Slide",
    brand: "ALOMZIEE FOOTIES",
    category: "Footwear",
    price: "₦30,000",
    image:
      "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Leather Statement Belt",
    brand: "ALOMZIEE FOOTIES",
    category: "Accessories",
    price: "₦15,000",
    image:
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Oversized Signature Hoodie",
    brand: "UTHY LUXURY",
    category: "Hoodies",
    price: "₦55,000",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Premium Leather Shoe",
    brand: "ALOMZIEE FOOTIES",
    category: "Footwear",
    price: "₦48,000",
    image:
      "https://images.unsplash.com/photo-1614252235316-8c857d2a84a1?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Traditional Statement Set",
    brand: "UTHY LUXURY",
    category: "Traditional",
    price: "₦75,000",
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Handmade Crossbody Bag",
    brand: "ALOMZIEE FOOTIES",
    category: "Accessories",
    price: "₦42,000",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
  },
];

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

function SectionImage({ section, className = "" }) {
  if (!section.image) return null;

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
        alt={section.title || "VÉRANE"}
        className={className}
      />
    </picture>
  );
}

function ProductCard({ product }) {
  return (
    <Link href="/catalog" className="group">
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-900 mb-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>

      <p className="text-[9px] md:text-[10px] font-bold tracking-[0.18em] uppercase text-amber-400">
        {product.brand}
      </p>

      <h3 className="font-semibold mt-1 text-sm md:text-base">
        {product.name}
      </h3>

      <p className="text-neutral-400 text-sm mt-1">
        {product.price}
      </p>
    </Link>
  );
}

export default async function HomePage() {
  const sections = await getHomepageSections();

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

  return (
    <main className="bg-black text-white overflow-hidden">

      {/* HERO */}
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
                    href={hero.secondaryButtonLink || "/outfit-builder"}
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

      {/* SELECTED PIECES */}
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
                {selected.buttonText} →
              </Link>
            )}

          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {PRODUCTS.slice(0, 4).map((product) => (
              <ProductCard
                product={product}
                key={product.name}
              />
            ))}
          </div>

        </section>
      )}

      {/* UTHY */}
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
                    href={uthy.buttonLink || "/catalog?brand=UTHY_LUXURY"}
                    className="inline-block mt-8 bg-white text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
                  >
                    {uthy.buttonText}
                  </Link>
                )}

              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">

            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl md:text-3xl font-black">
                From UTHY
              </h3>

              <Link
                href="/catalog?brand=UTHY_LUXURY"
                className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
              >
                Shop all →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PRODUCTS.filter(
                (product) => product.brand === "UTHY LUXURY"
              )
                .slice(0, 3)
                .map((product) => (
                  <ProductCard
                    product={product}
                    key={product.name}
                  />
                ))}
            </div>
          </section>
        </>
      )}

      {/* ALOMZIEE */}
      {alomziee?.enabled !== false && (
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
                  href={alomziee.buttonLink || "/catalog?brand=ALOMZIEE_FOOTIES"}
                  className="inline-block mt-8 bg-white text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
                >
                  {alomziee.buttonText}
                </Link>
              )}

            </div>
          </div>
        </section>
      )}

      {/* OUTFIT BUILDER */}
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
                  {["TOP", "BOTTOM", "SHOES", "ACCESSORIES"].map(
                    (item) => (
                      <div
                        key={item}
                        className="border border-white/10 rounded-xl p-3 text-center"
                      >
                        <div className="aspect-square bg-neutral-900 rounded-lg mb-2" />
                        <p className="text-[8px] tracking-wider text-neutral-500">
                          {item}
                        </p>
                      </div>
                    )
                  )}
                </div>

                {outfit.buttonText && (
                  <Link
                    href={outfit.buttonLink || "/outfit-builder"}
                    className="mt-8 inline-block px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-center bg-amber-500 text-black hover:bg-amber-400 transition"
                  >
                    {outfit.buttonText} →
                  </Link>
                )}

              </div>
            </div>
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
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
                {arrivals.buttonText} →
              </Link>
            )}

          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

            {PRODUCTS.slice(4, 8).map((product) => (
              <div key={product.name} className="group">
                <div className="relative aspect-[4/5] bg-neutral-900 rounded-2xl overflow-hidden">

                  <span className="absolute z-10 top-3 left-3 bg-white text-black text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    New
                  </span>

                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />
                </div>

                <p className="text-[9px] font-bold tracking-wider mt-4 text-amber-400">
                  {product.brand}
                </p>

                <h3 className="font-semibold text-sm mt-1">
                  {product.name}
                </h3>

                <p className="text-neutral-400 text-sm mt-1">
                  {product.price}
                </p>
              </div>
            ))}

          </div>
        </section>
      )}

      {/* STORY */}
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

      {/* NEWSLETTER */}
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

          <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">

            <input
              type="email"
              placeholder="Your email address"
              required
              className="flex-1 bg-neutral-900 border border-white/10 rounded-full px-5 py-4 text-sm outline-none focus:border-amber-500 transition"
            />

            <button
              type="submit"
              className="px-7 py-4 rounded-full font-bold text-sm bg-amber-500 text-black hover:bg-amber-400 transition"
            >
              {newsletter.buttonText || "Subscribe"}
            </button>

          </form>
        </section>
      )}

    </main>
  );
}