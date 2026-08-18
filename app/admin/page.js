import Link from "next/link";

const sections = [
  {
    href: "/admin/products",
    number: "01",
    icon: "▦",
    title: "Products",
    desc: "Add, edit and manage your entire product catalogue.",
    category: "Commerce",
  },
  {
    href: "/admin/products/add",
    number: "02",
    icon: "+",
    title: "Add Product",
    desc: "Create and publish a new product to your storefront.",
    category: "Commerce",
  },
  {
    href: "/admin/collections",
    number: "03",
    icon: "◇",
    title: "Collections",
    desc: "Organise products into curated collections.",
    category: "Commerce",
  },
  {
    href: "/admin/orders",
    number: "04",
    icon: "◌",
    title: "Orders",
    desc: "View and manage customer purchases and orders.",
    category: "Commerce",
  },
  {
    href: "/admin/homepage",
    number: "05",
    icon: "⌂",
    title: "Homepage",
    desc: "Control every section of your storefront homepage.",
    category: "Content",
  },
  {
    href: "/admin/navigation",
    number: "06",
    icon: "☰",
    title: "Navigation",
    desc: "Manage your website menus and navigation structure.",
    category: "Content",
  },
  {
    href: "/admin/footer",
    number: "07",
    icon: "≡",
    title: "Footer",
    desc: "Control footer content, links and information.",
    category: "Content",
  },
  {
    href: "/admin/pages",
    number: "08",
    icon: "□",
    title: "Pages",
    desc: "Manage About, Contact, FAQ and other pages.",
    category: "Content",
  },
  {
    href: "/admin/settings",
    number: "09",
    icon: "◉",
    title: "Site Settings",
    desc: "Control branding, contact details and global settings.",
    category: "Configuration",
  },
  {
    href: "/admin/subscribers",
    number: "10",
    icon: "✉",
    title: "Subscribers",
    desc: "Manage your newsletter audience and subscribers.",
    category: "Audience",
  },
  {
    href: "/admin/brands",
    number: "11",
    icon: "◈",
    title: "Brands",
    desc: "Manage UTHY LUXURY and ALOMZIEE FOOTIES branding.",
    category: "Configuration",
  },
];

const categoryDescriptions = {
  Commerce:
    "Manage the products, collections and transactions that power your store.",
  Content:
    "Shape the experience customers see when they visit your brand.",
  Configuration:
    "Control the identity and global behaviour of your storefront.",
  Audience:
    "Understand and manage the people connected to your brand.",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 lg:px-10">

        {/* HEADER */}
        <header className="mb-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
                  VÉRANE / ADMIN
                </span>
              </div>

              <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
                Command Center
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
                Everything you need to shape, manage and operate
                your storefront from one place.
              </p>
            </div>

            <Link
              href="/"
              className="group inline-flex w-fit items-center gap-3 rounded-full border border-white/[0.09] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <span>View Storefront</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </header>

        {/* QUICK OVERVIEW */}
        <section className="mb-12 grid gap-px overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
          <div className="bg-white/[0.025] p-6 sm:p-7">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">Store</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">VÉRANE</p>
            <p className="mt-1 text-xs text-white/30">Two brands. One expression.</p>
          </div>
          <div className="bg-white/[0.025] p-6 sm:p-7">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">Control</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{sections.length}</p>
            <p className="mt-1 text-xs text-white/30">Management areas</p>
          </div>
          <div className="bg-white/[0.025] p-6 sm:p-7">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">Status</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <p className="text-2xl font-semibold tracking-tight">Online</p>
            </div>
            <p className="mt-1 text-xs text-white/30">Storefront operational</p>
          </div>
        </section>

        {/* MANAGEMENT */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/80">Management</p>
            <h2 className="text-2xl font-semibold tracking-tight">Control your store</h2>
          </div>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/20 sm:block">{sections.length} modules</span>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[0.045] hover:shadow-2xl hover:shadow-black/40"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-400/[0.06] blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black text-lg text-white/60 transition-all duration-300 group-hover:border-amber-400/30 group-hover:text-amber-400">
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-medium tracking-[0.2em] text-white/20">{card.number}</span>
                </div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400/60">{card.category}</p>
                <h3 className="text-xl font-semibold tracking-tight text-white">{card.title}</h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-white/35">{card.desc}</p>
                <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 transition-colors group-hover:text-white/50">Manage</span>
                  <span className="text-white/25 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-400">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* BOTTOM MESSAGE */}
        <section className="mt-12 overflow-hidden rounded-[28px] border border-amber-400/10 bg-amber-400/[0.025] p-7 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">Brand Experience</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Your storefront, your control.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Every part of VÉRANE is being built to give you control without needing to edit the website code every time you want to change something.
              </p>
            </div>
            <Link
              href="/admin/settings"
              className="inline-flex w-fit shrink-0 items-center gap-3 rounded-full bg-amber-400 px-6 py-3 text-xs font-bold text-black transition hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(245,185,66,0.15)]"
            >
              Configure Store
              <span>→</span>
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}