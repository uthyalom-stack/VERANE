"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const BRAND_INFO = {
  UTHY: {
    code: "UTHY",
    aliases: ["UTHY", "UTHY_LUXURY"],
    name: "UTHY LUXURY",
    short: "UTHY",
    accent: "amber",
  },

  ALOMZIEE: {
    code: "ALOMZIEE",
    aliases: [
      "ALOMZIEE",
      "ALOMZIEE_FOOTIES",
    ],
    name: "ALOMZIEE FOOTIES",
    short: "ALOMZIEE",
    accent: "violet",
  },
};

export default function CollaborationsPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState([]);
  const [collaborations, setCollaborations] =
    useState([]);

  const [showCreate, setShowCreate] =
    useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedCollaboration, setSelectedCollaboration] =
    useState(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);

      const sessionResponse = await fetch(
        "/api/admin/session",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const sessionData =
        await sessionResponse
          .json()
          .catch(() => null);

      if (
        !sessionResponse.ok ||
        !sessionData?.admin
      ) {
        router.replace("/admin/login");
        return;
      }

      const currentAdmin =
        sessionData.admin;

      if (
        currentAdmin.role !== "UTHY" &&
        currentAdmin.role !== "ALOMZIEE"
      ) {
        router.replace("/admin");
        return;
      }

      setAdmin(currentAdmin);

      /*
       * IMPORTANT:
       * We now explicitly send the brand.
       */

      const brand =
        normalizeBrand(currentAdmin.role);

      const response = await fetch(
        `/api/admin/collaborations?brand=${encodeURIComponent(
          brand
        )}`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load collaborations."
        );
      }

      setRequests(
        Array.isArray(data?.requests)
          ? data.requests
          : []
      );

      setCollaborations(
        Array.isArray(
          data?.collaborations
        )
          ? data.collaborations
          : []
      );
    } catch (err) {
      console.error(
        "Collaboration page error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load collaboration data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCollaboration() {
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError(
        "Give your collaboration a title."
      );
      return;
    }

    if (!admin) return;

    const fromBrand =
      normalizeBrand(admin.role);

    const toBrand =
      fromBrand === "UTHY"
        ? "ALOMZIEE"
        : "UTHY";

    try {
      setSaving(true);

      const response = await fetch(
        "/api/admin/collaborations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",

          body: JSON.stringify({
            fromBrand,
            toBrand,
            title: title.trim(),
            message: message.trim(),
          }),
        }
      );

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to send collaboration request."
        );
      }

      setTitle("");
      setMessage("");
      setShowCreate(false);

      setSuccess(
        "Collaboration request sent successfully."
      );

      await loadPage();
    } catch (err) {
      console.error(
        "Create collaboration error:",
        err
      );

      setError(
        err?.message ||
          "Failed to send collaboration request."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest(
    requestId,
    status
  ) {
    setError("");
    setSuccess("");
    setActionId(requestId);

    try {
      const response = await fetch(
        `/api/admin/collaborations/${requestId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",

          body: JSON.stringify({
            status,
          }),
        }
      );

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to ${status} collaboration request.`
        );
      }

      setSuccess(
        status === "accepted"
          ? "Collaboration accepted. It is now active."
          : "Collaboration request declined."
      );

      await loadPage();
    } catch (err) {
      console.error(
        "Collaboration action error:",
        err
      );

      setError(
        err?.message ||
          "Failed to update collaboration."
      );
    } finally {
      setActionId(null);
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
            Loading collaborations
          </p>
        </div>
      </main>
    );
  }

  if (!admin) {
    return null;
  }

  const brand =
    admin.role === "UTHY"
      ? BRAND_INFO.UTHY
      : BRAND_INFO.ALOMZIEE;

  const otherBrand =
    admin.role === "UTHY"
      ? BRAND_INFO.ALOMZIEE
      : BRAND_INFO.UTHY;

  const incomingRequests =
    requests.filter(
      (request) =>
        normalizeBrand(
          request.toBrand
        ) === brand.code
    );

  const outgoingRequests =
    requests.filter(
      (request) =>
        normalizeBrand(
          request.fromBrand
        ) === brand.code
    );

  const pendingIncoming =
    incomingRequests.filter(
      (request) =>
        String(
          request.status
        ).toLowerCase() === "pending"
    );

  const pendingOutgoing =
    outgoingRequests.filter(
      (request) =>
        String(
          request.status
        ).toLowerCase() === "pending"
    );

  const activeCollaborations =
    collaborations.filter(
      (collaboration) =>
        String(
          collaboration.status ||
            "active"
        ).toLowerCase() ===
          "active"
    );

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="max-w-[1450px] mx-auto px-5 sm:px-8 py-8 md:py-12">

        {/* HEADER */}

        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">

            <div>
              <p
                className={`text-[9px] uppercase tracking-[0.35em] font-bold ${
                  brand.accent === "amber"
                    ? "text-amber-400"
                    : "text-violet-300"
                }`}
              >
                {brand.name} / Partnerships
              </p>

              <h1 className="text-4xl md:text-6xl font-black tracking-[-0.05em] mt-2">
                Collaborations.
              </h1>

              <p className="text-sm text-neutral-500 mt-3 max-w-xl leading-relaxed">
                Build something together.
                Partner with the other VÉRANE
                brand and create exclusive
                collaborative products.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowCreate(true);
              }}
              className={`rounded-2xl px-6 py-4 text-xs font-black transition ${
                brand.accent === "amber"
                  ? "bg-amber-500 text-black hover:bg-amber-400"
                  : "bg-violet-300 text-black hover:bg-violet-200"
              }`}
            >
              + Start a Collaboration
            </button>
          </div>
        </section>

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

        {/* STATS */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">

          <MiniStat
            label="Pending Requests"
            value={
              pendingIncoming.length
            }
            accent={brand.accent}
          />

          <MiniStat
            label="Sent Requests"
            value={
              pendingOutgoing.length
            }
            accent={brand.accent}
          />

          <MiniStat
            label="Active Collaborations"
            value={
              activeCollaborations.length
            }
            accent={brand.accent}
          />

          <MiniStat
            label="Partner"
            value={otherBrand.short}
            accent={brand.accent}
          />

        </section>

        {/* INCOMING */}

        <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden mb-5">

          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between gap-4">

            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                Incoming
              </p>

              <h2 className="text-xl font-black mt-1">
                Collaboration Requests
              </h2>
            </div>

            {pendingIncoming.length >
              0 && (
              <span className="rounded-full bg-red-500 px-3 py-1.5 text-[9px] font-black text-white">
                {pendingIncoming.length} NEW
              </span>
            )}
          </div>

          <div className="p-4">

            {incomingRequests.length ===
            0 ? (
              <EmptyState
                title="No collaboration requests"
                description="When the other VÉRANE brand wants to work with you, their proposal will appear here."
              />
            ) : (
              <div className="space-y-3">

                {incomingRequests.map(
                  (request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      incoming
                      actionId={actionId}
                      onAccept={() =>
                        updateRequest(
                          request.id,
                          "accepted"
                        )
                      }
                      onDecline={() =>
                        updateRequest(
                          request.id,
                          "declined"
                        )
                      }
                    />
                  )
                )}

              </div>
            )}

          </div>
        </section>

        {/* SENT */}

        <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden mb-5">

          <div className="p-6 border-b border-white/[0.06]">

            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              Outgoing
            </p>

            <h2 className="text-xl font-black mt-1">
              Requests You Sent
            </h2>

          </div>

          <div className="p-4">

            {outgoingRequests.length ===
            0 ? (
              <EmptyState
                title="You haven't sent any requests"
                description="Start a collaboration to send your first proposal."
              />
            ) : (
              <div className="space-y-3">

                {outgoingRequests.map(
                  (request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                    />
                  )
                )}

              </div>
            )}

          </div>
        </section>

        {/* ACTIVE */}

        <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">

          <div className="p-6 border-b border-white/[0.06]">

            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              Partnerships
            </p>

            <h2 className="text-xl font-black mt-1">
              Active Collaborations
            </h2>

          </div>

          <div className="p-4">

            {activeCollaborations.length ===
            0 ? (
              <EmptyState
                title="No active collaborations"
                description="Once a collaboration request is accepted, the partnership will automatically appear here."
              />
            ) : (
              <div className="space-y-4">

                {activeCollaborations.map(
                  (collaboration) => (
                    <ActiveCollaborationCard
                      key={
                        collaboration.id
                      }
                      collaboration={
                        collaboration
                      }
                      brand={brand}
                      onOpen={() =>
                        setSelectedCollaboration(
                          collaboration
                        )
                      }
                    />
                  )
                )}

              </div>
            )}

          </div>
        </section>
      </div>

      {/* CREATE REQUEST MODAL */}

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-5">

          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0c0c0c] shadow-2xl overflow-hidden">

            <div className="p-6 md:p-8 border-b border-white/[0.06]">

              <div className="flex items-start justify-between gap-5">

                <div>
                  <p
                    className={`text-[9px] uppercase tracking-[0.3em] font-bold ${
                      brand.accent === "amber"
                        ? "text-amber-400"
                        : "text-violet-300"
                    }`}
                  >
                    New Partnership
                  </p>

                  <h2 className="text-2xl md:text-3xl font-black mt-2">
                    Start a Collaboration
                  </h2>

                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    Your proposal will be
                    sent directly to{" "}
                    {otherBrand.name}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  className="w-9 h-9 rounded-xl border border-white/10 text-neutral-500 hover:text-white hover:bg-white/5 transition"
                >
                  ×
                </button>

              </div>
            </div>

            <div className="p-6 md:p-8 space-y-5">

              <div className="rounded-2xl border border-white/10 bg-black p-4">

                <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
                  Collaboration
                </p>

                <div className="flex items-center gap-3 mt-3">

                  <div className="flex-1 rounded-xl border border-white/10 px-4 py-3">
                    <p className="text-xs font-black">
                      {brand.name}
                    </p>
                  </div>

                  <span className="text-neutral-600">
                    ×
                  </span>

                  <div className="flex-1 rounded-xl border border-white/10 px-4 py-3">
                    <p className="text-xs font-black">
                      {otherBrand.name}
                    </p>
                  </div>

                </div>
              </div>

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-2">
                  Collaboration Title *
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. VÉRANE Summer Collection"
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white outline-none transition focus:border-amber-400/50"
                />

              </div>

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 mb-2">
                  Proposal Message
                </label>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  rows={6}
                  placeholder="Tell the other brand what you have in mind..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white outline-none transition focus:border-amber-400/50"
                />

              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  className="rounded-full border border-white/10 px-6 py-3 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    createCollaboration
                  }
                  disabled={saving}
                  className={`rounded-full px-7 py-3 text-xs font-black transition disabled:opacity-50 ${
                    brand.accent === "amber"
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "bg-violet-300 text-black hover:bg-violet-200"
                  }`}
                >
                  {saving
                    ? "Sending..."
                    : "Send Collaboration Request →"}
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLABORATION PRODUCT BUILDER */}

      {selectedCollaboration && (
        <CollaborationProductModal
          collaboration={
            selectedCollaboration
          }
          onClose={() =>
            setSelectedCollaboration(
              null
            )
          }
          onCreated={async () => {
            setSelectedCollaboration(
              null
            );

            setSuccess(
              "Collaboration product created successfully."
            );

            await loadPage();
          }}
        />
      )}
    </main>
  );
}

/* ============================================================
   ACTIVE COLLABORATION CARD
============================================================ */

function ActiveCollaborationCard({
  collaboration,
  brand,
  onOpen,
}) {
  const products =
    Array.isArray(
      collaboration.products
    )
      ? collaboration.products
      : [];

  return (
    <div className="rounded-[1.5rem] border border-emerald-500/10 bg-emerald-500/[0.025] p-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        <div>

          <div className="flex items-center gap-3">

            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Active
            </span>

            <span className="text-[9px] text-neutral-600">
              {products.length} collaborative{" "}
              {products.length === 1
                ? "product"
                : "products"}
            </span>

          </div>

          <h3 className="text-xl font-black mt-4">
            {collaboration.name ||
              "Collaboration"}
          </h3>

          <p className="text-xs text-neutral-500 mt-2">
            {formatBrand(
              collaboration.brandA
            )}{" "}
            ×{" "}
            {formatBrand(
              collaboration.brandB
            )}
          </p>

          {collaboration.description && (
            <p className="text-xs text-neutral-600 leading-6 mt-3 max-w-2xl">
              {
                collaboration.description
              }
            </p>
          )}

        </div>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-2xl bg-white text-black px-6 py-4 text-xs font-black hover:bg-neutral-200 transition"
        >
          Build Collaborative Product →
        </button>

      </div>

      {products.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3 mt-6">

          {products.map(
            (product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-white/[0.07] bg-black/30 p-4"
              >

                <p className="text-[8px] uppercase tracking-[0.2em] text-emerald-400">
                  Collaborative Product
                </p>

                <h4 className="text-sm font-black mt-2">
                  {product.name}
                </h4>

                <p className="text-[10px] text-neutral-600 mt-2">
                  {formatBrand(
                    product.productA
                      ?.brand
                  )}{" "}
                  +{" "}
                  {formatBrand(
                    product.productB
                      ?.brand
                  )}
                </p>

                <p className="text-sm font-black mt-4">
                  ₦
                  {Number(
                    product.price
                  ).toLocaleString()}
                </p>

                <StatusBadge
                  status={String(
                    product.status ||
                      "draft"
                  ).toLowerCase()}
                />

              </div>
            )
          )}

        </div>
      )}

    </div>
  );
}

/* ============================================================
   COLLABORATION PRODUCT MODAL
============================================================ */

function CollaborationProductModal({
  collaboration,
  onClose,
  onCreated,
}) {
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [brandAProducts, setBrandAProducts] =
    useState([]);

  const [brandBProducts, setBrandBProducts] =
    useState([]);

  const [productAId, setProductAId] =
    useState("");

  const [productBId, setProductBId] =
    useState("");

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [price, setPrice] =
    useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/collaborations/${collaboration.id}/products`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load products."
        );
      }

      setBrandAProducts(
        Array.isArray(
          data?.brandAProducts
        )
          ? data.brandAProducts
          : []
      );

      setBrandBProducts(
        Array.isArray(
          data?.brandBProducts
        )
          ? data.brandBProducts
          : []
      );
    } catch (err) {
      setError(
        err?.message ||
          "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedA =
    brandAProducts.find(
      (product) =>
        product.id === productAId
    );

  const selectedB =
    brandBProducts.find(
      (product) =>
        product.id === productBId
    );

  async function createProduct() {
    setError("");

    if (!productAId || !productBId) {
      setError(
        "Select one product from each brand."
      );
      return;
    }

    if (!name.trim()) {
      setError(
        "Give the collaborative product a name."
      );
      return;
    }

    if (
      !price ||
      Number(price) < 0
    ) {
      setError(
        "Enter a valid price."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/collaborations/${collaboration.id}/products`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",

          body: JSON.stringify({
            productAId,
            productBId,
            name: name.trim(),
            description:
              description.trim(),
            price: Number(price),
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create collaborative product."
        );
      }

      await onCreated();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to create collaborative product."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md overflow-y-auto p-5">

      <div className="min-h-full flex items-center justify-center">

        <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[#0b0b0b] shadow-2xl overflow-hidden">

          {/* HEADER */}

          <div className="p-6 md:p-8 border-b border-white/[0.06]">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-400 font-bold">
                  Active Partnership
                </p>

                <h2 className="text-2xl md:text-4xl font-black tracking-[-0.04em] mt-2">
                  Build Collaborative Product
                </h2>

                <p className="text-xs text-neutral-500 mt-2">
                  Combine one product from{" "}
                  <strong className="text-neutral-300">
                    {formatBrand(
                      collaboration.brandA
                    )}
                  </strong>{" "}
                  with one product from{" "}
                  <strong className="text-neutral-300">
                    {formatBrand(
                      collaboration.brandB
                    )}
                  </strong>
                  .
                </p>

              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl border border-white/10 text-neutral-500 hover:text-white hover:bg-white/5"
              >
                ×
              </button>

            </div>

          </div>

          {/* BODY */}

          <div className="p-6 md:p-8">

            {error && (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-20 text-center text-xs uppercase tracking-[0.2em] text-neutral-600">
                Loading brand products...
              </div>
            ) : (
              <div className="space-y-8">

                {/* PRODUCT SELECTION */}

                <div className="grid md:grid-cols-2 gap-5">

                  <ProductSelector
                    label={formatBrand(
                      collaboration.brandA
                    )}
                    products={
                      brandAProducts
                    }
                    value={productAId}
                    onChange={
                      setProductAId
                    }
                  />

                  <ProductSelector
                    label={formatBrand(
                      collaboration.brandB
                    )}
                    products={
                      brandBProducts
                    }
                    value={productBId}
                    onChange={
                      setProductBId
                    }
                  />

                </div>

                {/* PREVIEW */}

                {(selectedA ||
                  selectedB) && (
                  <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-5">

                    <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                      Product Combination
                    </p>

                    <div className="grid md:grid-cols-2 gap-3 mt-4">

                      <SelectedProduct
                        product={selectedA}
                      />

                      <SelectedProduct
                        product={selectedB}
                      />

                    </div>

                  </div>
                )}

                {/* COLLAB PRODUCT DETAILS */}

                <div className="rounded-[1.5rem] border border-white/[0.07] bg-black/30 p-5">

                  <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                    Collaborative Product
                  </p>

                  <div className="grid md:grid-cols-2 gap-5 mt-5">

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-400 mb-2">
                        Product Name *
                      </label>

                      <input
                        value={name}
                        onChange={(e) =>
                          setName(
                            e.target.value
                          )
                        }
                        placeholder="e.g. VÉRANE Signature Duo"
                        className="w-full rounded-2xl border border-white/10 bg-[#080808] px-5 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-400 mb-2">
                        Selling Price *
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={price}
                        onChange={(e) =>
                          setPrice(
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className="w-full rounded-2xl border border-white/10 bg-[#080808] px-5 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
                      />
                    </div>

                  </div>

                  <div className="mt-5">

                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-400 mb-2">
                      Description
                    </label>

                    <textarea
                      rows={5}
                      value={
                        description
                      }
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      placeholder="Describe the exclusive collaboration product..."
                      className="w-full resize-none rounded-2xl border border-white/10 bg-[#080808] px-5 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
                    />

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/10 px-7 py-3 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={
                      createProduct
                    }
                    className="rounded-full bg-emerald-400 px-7 py-3 text-xs font-black text-black hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {saving
                      ? "Creating..."
                      : "Create Collaborative Product →"}
                  </button>

                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT SELECTOR
============================================================ */

function ProductSelector({
  label,
  products,
  value,
  onChange,
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-5">

      <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
        Choose Product From
      </p>

      <h3 className="text-base font-black mt-1">
        {label}
      </h3>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-5 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none focus:border-emerald-400/40"
      >
        <option value="">
          Select a product...
        </option>

        {products.map(
          (product) => (
            <option
              key={product.id}
              value={product.id}
            >
              {product.name} — ₦
              {Number(
                product.price
              ).toLocaleString()}
            </option>
          )
        )}
      </select>

      {products.length === 0 && (
        <p className="text-[10px] text-amber-400 mt-3">
          This brand has no products
          available yet.
        </p>
      )}

    </div>
  );
}

/* ============================================================
   SELECTED PRODUCT
============================================================ */

function SelectedProduct({
  product,
}) {
  if (!product) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-xs text-neutral-700">
        Product not selected
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black p-5">

      <p className="text-[8px] uppercase tracking-[0.2em] text-emerald-400">
        Selected
      </p>

      <h4 className="text-sm font-black mt-2">
        {product.name}
      </h4>

      <p className="text-[10px] text-neutral-600 mt-2">
        {formatBrand(
          product.brand
        )}
      </p>

      <p className="text-sm font-black mt-4">
        ₦
        {Number(
          product.price
        ).toLocaleString()}
      </p>

    </div>
  );
}

/* ============================================================
   REQUEST CARD
============================================================ */

function RequestCard({
  request,
  incoming,
  actionId,
  onAccept,
  onDecline,
}) {
  const status = String(
    request.status || "pending"
  ).toLowerCase();

  const displayBrand = incoming
    ? formatBrand(
        request.fromBrand
      )
    : formatBrand(
        request.toBrand
      );

  return (
    <div
      className={`rounded-2xl border p-5 ${
        incoming &&
        status === "pending"
          ? "border-amber-400/20 bg-amber-400/[0.025]"
          : "border-white/[0.07] bg-black/20"
      }`}
    >

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">

        <div className="min-w-0">

          <div className="flex items-center gap-2 flex-wrap">

            <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
              {incoming
                ? "From"
                : "To"}
            </span>

            <span className="text-xs font-black">
              {displayBrand}
            </span>

            <StatusBadge
              status={status}
            />

          </div>

          <h3 className="text-base font-black mt-4">
            {request.title ||
              "Collaboration Request"}
          </h3>

          {request.message && (
            <p className="text-xs text-neutral-500 leading-6 mt-2 max-w-2xl">
              {request.message}
            </p>
          )}

          <p className="text-[9px] text-neutral-700 mt-4">
            {request.createdAt
              ? new Date(
                  request.createdAt
                ).toLocaleString()
              : ""}
          </p>

        </div>

        {incoming &&
          status === "pending" && (
            <div className="flex gap-2 shrink-0">

              <button
                type="button"
                disabled={
                  actionId ===
                  request.id
                }
                onClick={
                  onDecline
                }
                className="rounded-xl border border-white/10 px-4 py-3 text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
              >
                Decline
              </button>

              <button
                type="button"
                disabled={
                  actionId ===
                  request.id
                }
                onClick={onAccept}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-[10px] font-black text-black hover:bg-emerald-400 transition disabled:opacity-50"
              >
                {actionId ===
                request.id
                  ? "..."
                  : "Accept"}
              </button>

            </div>
          )}

      </div>
    </div>
  );
}

/* ============================================================
   MINI STAT
============================================================ */

function MiniStat({
  label,
  value,
  accent,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">

      <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
        {label}
      </p>

      <p
        className={`text-2xl font-black mt-3 ${
          accent === "amber"
            ? "text-amber-400"
            : "text-violet-300"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   STATUS
============================================================ */

function StatusBadge({
  status,
}) {
  const styles = {
    pending:
      "border-amber-400/20 bg-amber-400/5 text-amber-400",

    accepted:
      "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",

    active:
      "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",

    draft:
      "border-violet-400/20 bg-violet-400/5 text-violet-300",

    declined:
      "border-red-400/20 bg-red-400/5 text-red-400",

    rejected:
      "border-red-400/20 bg-red-400/5 text-red-400",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${
        styles[status] ||
        "border-white/10 text-neutral-500"
      }`}
    >
      {status}
    </span>
  );
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyState({
  title,
  description,
}) {
  return (
    <div className="py-12 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <span className="text-neutral-700">
          ◇
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-neutral-500">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-neutral-700">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   BRAND HELPERS
============================================================ */

function normalizeBrand(value) {
  if (!value) return "";

  const brand = String(value)
    .trim()
    .toUpperCase();

  if (
    brand === "UTHY" ||
    brand === "UTHY_LUXURY"
  ) {
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

function formatBrand(value) {
  const normalized =
    normalizeBrand(value);

  if (normalized === "UTHY") {
    return "UTHY LUXURY";
  }

  if (
    normalized === "ALOMZIEE"
  ) {
    return "ALOMZIEE FOOTIES";
  }

  return value || "Unknown Brand";
}