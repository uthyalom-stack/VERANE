"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboard({ admin }) {
  const router = useRouter();

  const isSuperAdmin = admin?.brand === "ALL";

  const isUthy =
    admin?.brand === "UTHY_LUXURY" || isSuperAdmin;

  const isAlomziee =
    admin?.brand === "ALOMZIEE_FOOTIES" || isSuperAdmin;

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-600">
              VÉRANE
            </p>

            <h1 className="text-2xl font-black mt-1">
              Control Center
            </h1>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-neutral-400 hover:text-white hover:border-white/20 transition"
          >
            Logout
          </button>

        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* WELCOME */}
        <section className="mb-12">

          <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
            Administrator
          </p>

          <h2 className="text-4xl md:text-5xl font-black mt-2">
            Welcome back
            {admin?.name ? `, ${admin.name}` : ""}
          </h2>

          <p className="text-sm text-neutral-500 mt-3">
            Manage your authorized brand systems from one place.
          </p>

        </section>

        {/* BRAND SYSTEMS */}
        <section>

          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
              Authorized Systems
            </p>

            <h3 className="text-2xl font-black mt-1">
              Brand Management
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* UTHY */}
            {isUthy && (
              <BrandCard
                title="UTHY"
                subtitle="LUXURY"
                description="Manage UTHY LUXURY products, collections, orders and brand content."
                onClick={() =>
                  router.push(
                    isSuperAdmin
                      ? "/admin/brands?brand=UTHY_LUXURY"
                      : "/admin/products?brand=UTHY_LUXURY"
                  )
                }
              />
            )}

            {/* ALOMZIEE */}
            {isAlomziee && (
              <BrandCard
                title="ALOMZIEE"
                subtitle="FOOTIES"
                description="Manage ALOMZIEE FOOTIES products, collections, orders and brand content."
                onClick={() =>
                  router.push(
                    isSuperAdmin
                      ? "/admin/brands?brand=ALOMZIEE_FOOTIES"
                      : "/admin/products?brand=ALOMZIEE_FOOTIES"
                  )
                }
              />
            )}

            {/* VÉRANE */}
            {isSuperAdmin && (
              <BrandCard
                title="VÉRANE"
                subtitle="ALL ACCESS"
                description="Full access to both brands, storefront content and administration."
                premium
                onClick={() =>
                  router.push("/admin/homepage")
                }
              />
            )}

          </div>

        </section>

        {/* MANAGEMENT */}
        <section className="mt-14">

          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
              Control Center
            </p>

            <h3 className="text-2xl font-black mt-1">
              Management
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* PRODUCTS */}
            {(isUthy || isAlomziee) && (
              <AdminLink
                title="Products"
                description="Manage catalog"
                onClick={() =>
                  router.push(
                    isSuperAdmin
                      ? "/admin/products"
                      : `/admin/products?brand=${admin.brand}`
                  )
                }
              />
            )}

            {/* COLLECTIONS */}
            {(isUthy || isAlomziee) && (
              <AdminLink
                title="Collections"
                description="Manage collections"
                onClick={() =>
                  router.push("/admin/collections")
                }
              />
            )}

            {/* ORDERS */}
            <AdminLink
              title="Orders"
              description="View customer orders"
              onClick={() =>
                router.push("/admin/orders")
              }
            />

            {/* HOMEPAGE */}
            {isSuperAdmin && (
              <AdminLink
                title="Homepage"
                description="Edit storefront"
                onClick={() =>
                  router.push("/admin/homepage")
                }
              />
            )}

            {/* NAVIGATION */}
            {isSuperAdmin && (
              <AdminLink
                title="Navigation"
                description="Manage site navigation"
                onClick={() =>
                  router.push("/admin/navigation")
                }
              />
            )}

            {/* MEDIA */}
            {isSuperAdmin && (
              <AdminLink
                title="Media"
                description="Manage website images"
                onClick={() =>
                  router.push("/admin/media")
                }
              />
            )}

            {/* BRANDS */}
            {isSuperAdmin && (
              <AdminLink
                title="Brands"
                description="Manage brand systems"
                onClick={() =>
                  router.push("/admin/brands")
                }
              />
            )}

            {/* PAGES */}
            {isSuperAdmin && (
              <AdminLink
                title="Pages"
                description="Manage website pages"
                onClick={() =>
                  router.push("/admin/pages")
                }
              />
            )}

            {/* FOOTER */}
            {isSuperAdmin && (
              <AdminLink
                title="Footer"
                description="Edit site footer"
                onClick={() =>
                  router.push("/admin/footer")
                }
              />
            )}

            {/* DISCOUNTS */}
            {isSuperAdmin && (
              <AdminLink
                title="Discounts"
                description="Manage promotions"
                onClick={() =>
                  router.push("/admin/discounts")
                }
              />
            )}

            {/* SUBSCRIBERS */}
            {isSuperAdmin && (
              <AdminLink
                title="Subscribers"
                description="Manage subscribers"
                onClick={() =>
                  router.push("/admin/subscribers")
                }
              />
            )}

            {/* SETTINGS */}
            {isSuperAdmin && (
              <AdminLink
                title="Settings"
                description="Global site settings"
                onClick={() =>
                  router.push("/admin/settings")
                }
              />
            )}

          </div>

        </section>

      </div>

    </main>
  );
}


/* -------------------------------- */
/* BRAND CARD */
/* -------------------------------- */

function BrandCard({
  title,
  subtitle,
  description,
  onClick,
  premium = false,
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-3xl border p-7 transition ${
        premium
          ? "border-amber-400/20 bg-amber-400/[0.04] hover:border-amber-400/40"
          : "border-white/10 bg-white/[0.03] hover:border-amber-400/30 hover:bg-white/[0.05]"
      }`}
    >

      <div className="flex items-center justify-between">

        <div>

          <p
            className={`text-xl font-black ${
              premium ? "text-amber-400" : ""
            }`}
          >
            {title}
          </p>

          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 mt-1">
            {subtitle}
          </p>

        </div>

        <span className="text-amber-400 text-xl">
          →
        </span>

      </div>

      <p className="text-xs text-neutral-500 mt-7 leading-relaxed">
        {description}
      </p>

    </button>
  );
}


/* -------------------------------- */
/* MANAGEMENT LINK */
/* -------------------------------- */

function AdminLink({
  title,
  description,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/20 transition"
    >

      <p className="text-sm font-black">
        {title}
      </p>

      <p className="text-[10px] text-neutral-600 mt-1">
        {description}
      </p>

    </button>
  );
}