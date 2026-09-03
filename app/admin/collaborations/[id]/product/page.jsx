"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BRAND_INFO = {
  UTHY: {
    name: "UTHY LUXURY",
    accent: "amber",
  },
  ALOMZIEE: {
    name: "ALOMZIEE FOOTIES",
    accent: "violet",
  },
};

function normalizeBrand(value) {
  if (!value) return "";

  const brand = String(value).trim().toUpperCase();

  if (brand === "UTHY" || brand === "UTHY_LUXURY") {
    return "UTHY";
  }

  if (
    brand === "ALOMZIEE" ||
    brand === "ALOMZIEE_FOOTIES"
  ) {
    return "ALOMZIEE";
  }

  return brand;
}

function getProductImage(product) {
  if (!product?.images) {
    return null;
  }

  if (Array.isArray(product.images)) {
    return product.images[0] || null;
  }

  try {
    const parsed = JSON.parse(product.images);

    if (Array.isArray(parsed)) {
      return parsed[0] || null;
    }

    if (typeof parsed === "string") {
      return parsed;
    }
  } catch {
    if (typeof product.images === "string") {
      return product.images;
    }
  }

  return null;
}

export default function CollaborationProductPage() {
  const router = useRouter();
  const params = useParams();

  const collaborationId = params?.id;

  const [admin, setAdmin] = useState(null);
  const [collaboration, setCollaboration] = useState(null);

  const [myProducts, setMyProducts] = useState([]);
  const [partnerProducts, setPartnerProducts] = useState([]);

  const [selectedProductA, setSelectedProductA] = useState("");
  const [selectedProductB, setSelectedProductB] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (collaborationId) {
      loadPage();
    }
  }, [collaborationId]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const sessionResponse = await fetch(
        "/api/admin/session",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const sessionData =
        await sessionResponse.json().catch(() => null);

      if (
        !sessionResponse.ok ||
        !sessionData?.admin
      ) {
        router.replace("/admin/login");
        return;
      }

      const currentAdmin = sessionData.admin;

      setAdmin(currentAdmin);

      const collaborationResponse = await fetch(
        `/api/admin/collaborations/${collaborationId}`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const collaborationData =
        await collaborationResponse
          .json()
          .catch(() => null);

      if (!collaborationResponse.ok) {
        throw new Error(
          collaborationData?.error ||
            "Failed to load collaboration."
        );
      }

      const currentCollaboration =
        collaborationData?.collaboration ||
        collaborationData?.request;

      if (!currentCollaboration) {
        throw new Error(
          "Collaboration could not be found."
        );
      }

      if (
        currentCollaboration.status !== "active" &&
        currentCollaboration.status !== "accepted"
      ) {
        throw new Error(
          "This collaboration is not active yet."
        );
      }

      setCollaboration(currentCollaboration);

      const productsResponse = await fetch(
        "/api/admin/products",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const productsData =
        await productsResponse
          .json()
          .catch(() => null);

      if (!productsResponse.ok) {
        throw new Error(
          productsData?.error ||
            "Failed to load products."
        );
      }

      const allProducts = Array.isArray(productsData)
        ? productsData
        : Array.isArray(productsData?.products)
        ? productsData.products
        : [];

      const currentBrand =
        normalizeBrand(currentAdmin.role);

      const brandA = normalizeBrand(
        currentCollaboration.brandA
      );

      const brandB = normalizeBrand(
        currentCollaboration.brandB
      );

      const currentBrandProducts =
        allProducts.filter(
          (product) =>
            normalizeBrand(product.brand) ===
            currentBrand
        );

      const partnerBrand =
        currentBrand === brandA
          ? brandB
          : brandA;

      const partnerBrandProducts =
        allProducts.filter(
          (product) =>
            normalizeBrand(product.brand) ===
            partnerBrand
        );

      setMyProducts(currentBrandProducts);
      setPartnerProducts(partnerBrandProducts);

      const existingProducts =
        Array.isArray(currentCollaboration.products)
          ? currentCollaboration.products
          : [];

      if (existingProducts.length > 0) {
        const existing = existingProducts[0];

        if (
          existing.productAId &&
          existing.productBId
        ) {
          const myIsA = currentBrand === brandA;

          setSelectedProductA(
            myIsA
              ? existing.productAId
              : existing.productBId
          );

          setSelectedProductB(
            myIsA
              ? existing.productBId
              : existing.productAId
          );

          setName(existing.name || "");

          setDescription(
            existing.description || ""
          );

          setPrice(
            existing.price != null
              ? String(existing.price)
              : ""
          );
        }
      }
    } catch (err) {
      console.error(
        "COLLABORATION PRODUCT PAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to load collaboration."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedMine = useMemo(() => {
    return myProducts.find(
      (product) =>
        String(product.id) ===
        String(selectedProductA)
    );
  }, [myProducts, selectedProductA]);

  const selectedPartner = useMemo(() => {
    return partnerProducts.find(
      (product) =>
        String(product.id) ===
        String(selectedProductB)
    );
  }, [partnerProducts, selectedProductB]);

  async function createProduct() {
    setError("");
    setSuccess("");

    if (!selectedProductA) {
      setError("Choose your product first.");
      return;
    }

    if (!selectedProductB) {
      setError(
        "Choose your partner's product."
      );
      return;
    }

    if (!name.trim()) {
      setError(
        "Give the collaboration product a name."
      );
      return;
    }

    const numericPrice = Number(price);

    if (
      !price ||
      Number.isNaN(numericPrice) ||
      numericPrice <= 0
    ) {
      setError(
        "Enter a valid collaboration price."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/admin/collaborations/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            collaborationId,
            productAId: selectedProductA,
            productBId: selectedProductB,
            name: name.trim(),
            description: description.trim(),
            price: numericPrice,
            status: "published",
          }),
        }
      );

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create collaboration product."
        );
      }

      setSuccess(
        "Collaboration product created successfully."
      );

      await loadPage();
    } catch (err) {
      console.error(
        "CREATE COLLABORATION PRODUCT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to create collaboration product."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] flex items-center justify-center mx-auto">
            <span className="text-amber-400 font-black">
              V
            </span>
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-neutral-600">
            Loading collaboration
          </p>
        </div>
      </main>
    );
  }

  if (!admin || !collaboration) {
    return null;
  }

  const currentBrand =
    normalizeBrand(admin.role);

  const brandA =
    normalizeBrand(collaboration.brandA);

  const brandB =
    normalizeBrand(collaboration.brandB);

  const isBrandA =
    currentBrand === brandA;

  const myBrandName =
    BRAND_INFO[currentBrand]?.name ||
    currentBrand;

  const partnerBrand =
    isBrandA ? brandB : brandA;

  const partnerBrandName =
    BRAND_INFO[partnerBrand]?.name ||
    partnerBrand;

  const mySelectedProduct = selectedMine;
  const partnerSelectedProduct = selectedPartner;

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="max-w-[1450px] mx-auto px-5 sm:px-8 py-8 md:py-12">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">

          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/collaborations"
                )
              }
              className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-white transition"
            >
              ← Back to Collaborations
            </button>

            <p className="text-[9px] uppercase tracking-[0.35em] text-emerald-400 font-bold mt-6">
              Collaboration Product
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-[-0.05em] mt-2">
              Build the Drop.
            </h1>

            <p className="text-sm text-neutral-500 mt-3 max-w-2xl leading-relaxed">
              Combine one product from{" "}
              <strong className="text-white">
                {myBrandName}
              </strong>{" "}
              with one product from{" "}
              <strong className="text-white">
                {partnerBrandName}
              </strong>{" "}
              and create the official VÉRANE collaboration product.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.03] px-5 py-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
              Partnership
            </p>

            <p className="text-sm font-black mt-1">
              {myBrandName} × {partnerBrandName}
            </p>
          </div>

        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* PRODUCT SELECTION */}

        <section className="grid lg:grid-cols-2 gap-5">

          <ProductSelector
            label="YOUR PRODUCT"
            brand={myBrandName}
            products={myProducts}
            selected={selectedProductA}
            setSelected={setSelectedProductA}
            accent={
              BRAND_INFO[currentBrand]?.accent ||
              "amber"
            }
          />

          <ProductSelector
            label="PARTNER PRODUCT"
            brand={partnerBrandName}
            products={partnerProducts}
            selected={selectedProductB}
            setSelected={setSelectedProductB}
            accent={
              BRAND_INFO[partnerBrand]?.accent ||
              "violet"
            }
          />

        </section>

        {/* PREVIEW */}

        <section className="mt-5 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">

          <div className="p-6 border-b border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              Product Preview
            </p>

            <h2 className="text-xl font-black mt-1">
              The Collaboration
            </h2>
          </div>

          <div className="p-6">

            <div className="grid md:grid-cols-2 gap-4">

              <PreviewProduct
                product={mySelectedProduct}
                label={myBrandName}
              />

              <PreviewProduct
                product={partnerSelectedProduct}
                label={partnerBrandName}
              />

            </div>

            {mySelectedProduct &&
              partnerSelectedProduct && (
                <div className="mt-5 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5">

                  <div className="flex items-center justify-center gap-3 text-sm font-black">
                    <span>
                      {mySelectedProduct.name}
                    </span>

                    <span className="text-emerald-400">
                      ×
                    </span>

                    <span>
                      {partnerSelectedProduct.name}
                    </span>
                  </div>

                  <p className="text-center text-[10px] text-neutral-600 mt-2">
                    These two products will become
                    the foundation of the collaboration.
                  </p>

                </div>
              )}

          </div>
        </section>

        {/* PRODUCT DETAILS */}

        <section className="mt-5 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">

          <div className="p-6 border-b border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              Product Details
            </p>

            <h2 className="text-xl font-black mt-1">
              Create the Collaboration Product
            </h2>
          </div>

          <div className="p-6 grid lg:grid-cols-2 gap-5">

            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-2">
                Collaboration Product Name *
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="e.g. VÉRANE Signature Duo"
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-2">
                Collaboration Price *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="e.g. 150000"
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-2">
                Status
              </label>

              <div className="rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-emerald-400 font-bold">
                Published
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-2">
                Description
              </label>

              <textarea
                rows={6}
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Describe what makes this collaboration product special..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
              />
            </div>

          </div>

          <div className="p-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-end gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/collaborations"
                )
              }
              className="rounded-full border border-white/10 px-6 py-3 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={createProduct}
              className="rounded-full bg-emerald-500 px-7 py-3 text-xs font-black text-black hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Collaboration Product →"}
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}


/* ============================================================
   PRODUCT SELECTOR
============================================================ */

function ProductSelector({
  label,
  brand,
  products,
  selected,
  setSelected,
  accent,
}) {
  return (
    <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">

      <div className="p-6 border-b border-white/[0.06]">

        <p
          className={`text-[9px] uppercase tracking-[0.25em] font-bold ${
            accent === "amber"
              ? "text-amber-400"
              : "text-violet-300"
          }`}
        >
          {label}
        </p>

        <h2 className="text-xl font-black mt-1">
          {brand}
        </h2>

        <p className="text-[10px] text-neutral-600 mt-2">
          Choose one product from this brand.
        </p>

      </div>

      <div className="p-4">

        {products.length === 0 ? (
          <div className="py-12 text-center">

            <p className="text-xs font-bold text-neutral-500">
              No products found
            </p>

            <p className="text-[10px] text-neutral-700 mt-2">
              This brand needs at least one product
              before it can be added to the collaboration.
            </p>

          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">

            {products.map((product) => {
              const image =
                getProductImage(product);

              const isSelected =
                String(selected) ===
                String(product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() =>
                    setSelected(product.id)
                  }
                  className={`text-left rounded-2xl border overflow-hidden transition ${
                    isSelected
                      ? accent === "amber"
                        ? "border-amber-400/50 bg-amber-400/[0.06]"
                        : "border-violet-300/50 bg-violet-300/[0.06]"
                      : "border-white/[0.07] bg-black/20 hover:border-white/20"
                  }`}
                >

                  <div className="aspect-square bg-black overflow-hidden">

                    {image ? (
                      <img
                        src={image}
                        alt={product.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-700 text-2xl">
                        ◇
                      </div>
                    )}

                  </div>

                  <div className="p-4">

                    <div className="flex items-start justify-between gap-2">

                      <p className="text-xs font-black">
                        {product.name}
                      </p>

                      {isSelected && (
                        <span className="text-emerald-400 text-xs">
                          ✓
                        </span>
                      )}

                    </div>

                    <p className="text-[10px] text-neutral-600 mt-2">
                      ₦
                      {Number(
                        product.price || 0
                      ).toLocaleString()}
                    </p>

                  </div>

                </button>
              );
            })}

          </div>
        )}

      </div>
    </section>
  );
}


/* ============================================================
   PREVIEW PRODUCT
============================================================ */

function PreviewProduct({
  product,
  label,
}) {
  const image =
    getProductImage(product);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 overflow-hidden">

      <div className="aspect-[4/3] bg-black">

        {image ? (
          <img
            src={image}
            alt={
              product?.name ||
              label ||
              "Product"
            }
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700">
            <span className="text-3xl">
              ◇
            </span>
          </div>
        )}

      </div>

      <div className="p-5">

        <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
          {label}
        </p>

        <p className="text-sm font-black mt-2">
          {product?.name ||
            "Select a product"}
        </p>

        {product && (
          <p className="text-[10px] text-neutral-600 mt-2">
            ₦
            {Number(
              product.price || 0
            ).toLocaleString()}
          </p>
        )}

      </div>
    </div>
  );
}