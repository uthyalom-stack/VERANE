"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboard({ admin }) {
  const router = useRouter();

  const isSuperAdmin = admin?.role === "SUPERADMIN";
  const isUthy = admin?.role === "UTHY";
  const isAlomziee = admin?.role === "ALOMZIEE";
  const isStoreAdmin = isUthy || isAlomziee;

  const storeName = isUthy
    ? "UTHY LUXURY"
    : isAlomziee
    ? "ALOMZIEE FOOTIES"
    : "VÉRANE";

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-600">
              {isSuperAdmin ? "VÉRANE" : storeName}
            </p>

            <h1 className="mt-1 text-2xl font-black">
              {isSuperAdmin
                ? "Platform Control"
                : "Store Control Center"}
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-neutral-400 transition hover:border-white/20 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
            {isSuperAdmin
              ? "Super Administrator"
              : "Store Administrator"}
          </p>

          <h2 className="mt-2 text-4xl font-black md:text-5xl">
            Welcome back
            {admin?.name ? `, ${admin.name}` : ""}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            {isSuperAdmin
              ? "Control the VÉRANE website, brand systems and platform infrastructure."
              : `Manage ${storeName} products, categories, collections, orders and store operations.`}
          </p>
        </section>

        {isStoreAdmin && (
          <section>
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                Your Store
              </p>

              <h3 className="mt-1 text-2xl font-black">
                {storeName}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <AdminLink
                title="Analytics"
                description="View store sales & statistics"
                onClick={() =>
                  router.push("/admin/analytics")
                }
              />

              <AdminLink
                title="Products"
                description="Manage your catalog"
                onClick={() =>
                  router.push("/admin/products")
                }
              />

              <AdminLink
                title="Categories"
                description="Create and manage categories"
                onClick={() =>
                  router.push("/admin/categories")
                }
              />

              <AdminLink
                title="Collections"
                description="Curate your collections"
                onClick={() =>
                  router.push("/admin/collections")
                }
              />

              <AdminLink
                title="Orders"
                description="Manage store orders"
                onClick={() =>
                  router.push("/admin/orders")
                }
              />

              <AdminLink
                title="Discounts"
                description="Manage store promotions"
                onClick={() =>
                  router.push("/admin/discounts")
                }
              />

              <AdminLink
                title="Subscribers"
                description="Manage store subscribers"
                onClick={() =>
                  router.push("/admin/subscribers")
                }
              />
            </div>
          </section>
        )}

        {isSuperAdmin && (
          <section>
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                Platform Control
              </p>

              <h3 className="mt-1 text-2xl font-black">
                VÉRANE Website
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <AdminLink
                title="Homepage"
                description="Control storefront content"
                onClick={() =>
                  router.push("/admin/homepage")
                }
              />

              <AdminLink
                title="Navigation"
                description="Manage website navigation"
                onClick={() =>
                  router.push("/admin/navigation")
                }
              />

              <AdminLink
                title="Footer"
                description="Manage site footer"
                onClick={() =>
                  router.push("/admin/footer")
                }
              />

              <AdminLink
                title="Pages"
                description="Manage website pages"
                onClick={() =>
                  router.push("/admin/pages")
                }
              />

              <AdminLink
                title="Media"
                description="Manage website media"
                onClick={() =>
                  router.push("/admin/media")
                }
              />

              <AdminLink
                title="Brands"
                description="Manage brand systems"
                onClick={() =>
                  router.push("/admin/brands")
                }
              />

              <AdminLink
                title="Subscribers"
                description="Manage platform subscribers"
                onClick={() =>
                  router.push("/admin/subscribers")
                }
              />

              <AdminLink
                title="Delivery"
                description="Manage countries, cities & rates"
                onClick={() =>
                  router.push("/admin/delivery")
                }
              />

              <AdminLink
                title="Settings"
                description="Manage global site settings"
                onClick={() =>
                  router.push("/admin/settings")
                }
              />
            </div>

            <div className="mt-10 rounded-3xl border border-amber-400/10 bg-amber-400/[0.03] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                Store Access
              </p>

              <h3 className="mt-2 text-xl font-black">
                Store inventory is isolated
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                UTHY and ALOMZIEE manage their own products,
                categories, collections, orders and discounts.
                Super Admin controls the platform rather than
                their store inventory.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function AdminLink({
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-amber-400/20 hover:bg-white/[0.04]"
    >
      <p className="text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-[10px] leading-5 text-neutral-600">
        {description}
      </p>
    </button>
  );
}
