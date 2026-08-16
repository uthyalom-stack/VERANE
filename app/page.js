import Link from "next/link";

const selectedPieces = [
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
];

const newArrivals = [
  {
    name: "Oversized Signature Hoodie",
    brand: "UTHY LUXURY",
    price: "₦55,000",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Premium Leather Shoe",
    brand: "ALOMZIEE FOOTIES",
    price: "₦48,000",
    image:
      "https://images.unsplash.com/photo-1614252235316-8c857d2a84a1?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Traditional Statement Set",
    brand: "UTHY LUXURY",
    price: "₦75,000",
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Handmade Crossbody Bag",
    brand: "ALOMZIEE FOOTIES",
    price: "₦42,000",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
  },
];

export default function HomePage() {
  return (
    <main className="bg-black text-white overflow-hidden">

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Background imagery */}
        <div className="absolute inset-0">
          <div className="absolute left-[-10%] top-[-5%] w-[65%] h-[110%] opacity-35">
            <img
              src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=85"
              alt="UTHY fashion"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute right-[-10%] top-[-5%] w-[60%] h-[110%] opacity-30">
            <img
              src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1400&q=85"
              alt="ALOMZIEE footwear"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-black" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full py-32">
          <div className="max-w-5xl">

            <p className="text-amber-400 text-xs md:text-sm font-bold tracking-[0.5em] uppercase mb-7">
              VÉRANE
            </p>

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black leading-[0.85] tracking-[-0.06em]">
              TWO BRANDS.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
                ONE EXPRESSION.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-neutral-300 text-base md:text-lg leading-relaxed">
              UTHY LUXURY and ALOMZIEE FOOTIES. Clothing, footwear and
              accessories made for people who refuse to look ordinary.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Link
                href="/catalog"
                className="bg-amber-500 text-black px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider text-center hover:bg-amber-400 transition-all hover:scale-[1.02]"
              >
                Explore Collection
              </Link>

              <Link
                href="/outfit-builder"
                className="border border-white/30 backdrop-blur-md px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider text-center hover:bg-white hover:text-black transition-all"
              >
                Build Your Look
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-5 sm:left-8 flex items-center gap-3 text-neutral-500 text-[10px] uppercase tracking-[0.3em]">
            <span className="w-10 h-px bg-neutral-700" />
            Discover
          </div>
        </div>
      </section>


      {/* =====================================================
          SELECTED PIECES
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-28">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-5">
          <div>
            <p className="text-amber-400 text-xs font-bold tracking-[0.35em] uppercase mb-4">
              Curated for you
            </p>

            <h2 className="text-4xl md:text-6xl font-black tracking-tight">
              Selected Pieces
            </h2>
          </div>

          <Link
            href="/catalog"
            className="text-sm font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition"
          >
            View Collection →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {selectedPieces.map((product) => (
            <Link
              href="/catalog"
              key={product.name}
              className="group"
            >
              <div className="aspect-[4/5] bg-neutral-900 overflow-hidden rounded-2xl mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              <p className="text-[9px] md:text-[10px] text-amber-400 font-bold tracking-[0.18em] uppercase">
                {product.brand}
              </p>

              <h3 className="font-semibold mt-1 text-sm md:text-base">
                {product.name}
              </h3>

              <p className="text-neutral-400 text-sm mt-1">
                {product.price}
              </p>
            </Link>
          ))}
        </div>
      </section>


      {/* =====================================================
          UTHY LUXURY
      ====================================================== */}
      <section className="relative min-h-[75vh] flex items-center overflow-hidden border-y border-white/5">

        <img
          src="https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1800&q=85"
          alt="UTHY Luxury"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full">
          <div className="max-w-xl">

            <p className="text-amber-400 text-xs font-bold tracking-[0.4em] uppercase mb-5">
              UTHY LUXURY
            </p>

            <h2 className="text-5xl md:text-7xl font-black leading-[0.9]">
              CLOTHED
              <br />
              DIFFERENTLY.
            </h2>

            <p className="text-neutral-300 mt-7 leading-relaxed max-w-md">
              Custom shirts, tailored trousers, hoodies and traditional
              pieces crafted to give your wardrobe its own identity.
            </p>

            <Link
              href="/catalog?brand=UTHY_LUXURY"
              className="inline-block mt-8 bg-white text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
            >
              Explore UTHY
            </Link>

          </div>
        </div>
      </section>


      {/* =====================================================
          UTHY PRODUCT STRIP
      ====================================================== */}
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
          {selectedPieces.slice(0, 3).map((product) => (
            <Link
              href="/catalog?brand=UTHY_LUXURY"
              key={product.name}
              className="group"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-900">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* =====================================================
          ALOMZIEE
      ====================================================== */}
      <section className="relative min-h-[75vh] flex items-center overflow-hidden border-y border-white/5">

        <img
          src="https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=1800&q=85"
          alt="Alomziee Footies"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full">
          <div className="max-w-xl">

            <p className="text-amber-400 text-xs font-bold tracking-[0.4em] uppercase mb-5">
              ALOMZIEE FOOTIES
            </p>

            <h2 className="text-5xl md:text-7xl font-black leading-[0.9]">
              FROM THE
              <br />
              GROUND UP.
            </h2>

            <p className="text-neutral-300 mt-7 leading-relaxed max-w-md">
              Handmade footwear and accessories built with character —
              shoes, sandals, slides, boots, belts and bags.
            </p>

            <Link
              href="/catalog?brand=ALOMZIEE_FOOTIES"
              className="inline-block mt-8 bg-white text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
            >
              Explore Alomziee
            </Link>

          </div>
        </div>
      </section>


      {/* =====================================================
          OUTFIT BUILDER
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-28">

        <div className="rounded-[2rem] bg-neutral-950 border border-white/10 overflow-hidden">

          <div className="grid md:grid-cols-2 min-h-[600px]">

            {/* Visual */}
            <div className="relative flex items-center justify-center bg-gradient-to-b from-neutral-900 to-black p-10">

              <div className="absolute top-8 left-8">
                <p className="text-amber-400 text-[10px] font-bold tracking-[0.3em] uppercase">
                  VÉRANE STUDIO
                </p>
              </div>

              {/* Temporary mannequin */}
              <div className="relative w-56 h-[430px]">

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-neutral-700 border border-white/10" />

                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-40 h-64 rounded-[45%] bg-neutral-800 border border-white/10" />

                <div className="absolute top-36 left-1/2 -translate-x-[105%] w-14 h-52 rounded-full bg-neutral-800 rotate-[8deg] border border-white/10" />

                <div className="absolute top-36 left-1/2 translate-x-[5%] w-14 h-52 rounded-full bg-neutral-800 -rotate-[8deg] border border-white/10" />

                <div className="absolute top-[265px] left-1/2 -translate-x-[95%] w-16 h-40 rounded-full bg-neutral-800 border border-white/10" />

                <div className="absolute top-[265px] left-1/2 translate-x-[0%] w-16 h-40 rounded-full bg-neutral-800 border border-white/10" />

              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-14 flex flex-col justify-center">

              <p className="text-amber-400 text-xs font-bold tracking-[0.35em] uppercase mb-5">
                Your wardrobe. Your rules.
              </p>

              <h2 className="text-4xl md:text-6xl font-black leading-none">
                BUILD
                <br />
                YOUR LOOK.
              </h2>

              <p className="text-neutral-400 mt-6 leading-relaxed max-w-md">
                Mix UTHY clothing with ALOMZIEE footwear and accessories.
                Build the outfit in real time and see the complete look
                before you buy.
              </p>

              <div className="grid grid-cols-4 gap-2 mt-10">
                {["TOP", "BOTTOM", "SHOES", "ACCESSORIES"].map((item) => (
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

              <Link
                href="/outfit-builder"
                className="mt-8 inline-block bg-amber-500 text-black px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-center hover:bg-amber-400 transition"
              >
                Enter Outfit Builder →
              </Link>

            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          NEW ARRIVALS
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <p className="text-amber-400 text-xs font-bold tracking-[0.35em] uppercase mb-4">
              Just dropped
            </p>

            <h2 className="text-4xl md:text-6xl font-black">
              New Arrivals
            </h2>
          </div>

          <Link
            href="/catalog"
            className="mt-5 md:mt-0 text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
          >
            View everything →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

          {newArrivals.map((product) => (
            <Link
              href="/catalog"
              key={product.name}
              className="group"
            >
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

              <p className="text-[9px] text-amber-400 font-bold tracking-wider mt-4">
                {product.brand}
              </p>

              <h3 className="font-semibold text-sm mt-1">
                {product.name}
              </h3>

              <p className="text-neutral-400 text-sm mt-1">
                {product.price}
              </p>
            </Link>
          ))}

        </div>
      </section>


      {/* =====================================================
          EDITORIAL / BRAND STORY
      ====================================================== */}
      <section className="relative min-h-[70vh] flex items-center justify-center text-center mt-20">

        <img
          src="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85"
          alt="Verane editorial"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/65" />

        <div className="relative z-10 max-w-2xl px-5">

          <p className="text-amber-400 text-xs font-bold tracking-[0.4em] uppercase mb-6">
            The philosophy
          </p>

          <h2 className="text-4xl md:text-7xl font-black leading-none">
            CRAFTED
            <br />
            WITH INTENTION.
          </h2>

          <p className="text-neutral-300 mt-7 leading-relaxed">
            Two expressions. One philosophy. Pieces created with intention
            for people who don't want to look like everybody else.
          </p>

          <Link
            href="/about"
            className="inline-block mt-8 border border-white/30 px-7 py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-white hover:text-black transition"
          >
            Discover the Story
          </Link>

        </div>
      </section>


      {/* =====================================================
          NEWSLETTER
      ====================================================== */}
      <section className="max-w-3xl mx-auto px-5 py-28 text-center">

        <p className="text-amber-400 text-xs font-bold tracking-[0.35em] uppercase mb-5">
          Stay close
        </p>

        <h2 className="text-3xl md:text-5xl font-black">
          JOIN THE LIST.
        </h2>

        <p className="text-neutral-400 mt-4 mb-8">
          New drops, exclusive pieces and early access.
        </p>

        <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <input
            type="email"
            placeholder="Your email address"
            required
            className="flex-1 bg-neutral-900 border border-white/10 rounded-full px-5 py-4 text-sm outline-none focus:border-amber-500 transition"
          />

          <button
            type="submit"
            className="bg-amber-500 text-black px-7 py-4 rounded-full font-bold text-sm hover:bg-amber-400 transition"
          >
            Subscribe
          </button>
        </form>
      </section>

    </main>
  );
}