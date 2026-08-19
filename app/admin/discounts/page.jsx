"use client";

import { useEffect, useMemo, useState } from "react";

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  type: "percentage",
  value: "",
  minimumOrder: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  enabled: true,
  stackable: false,
};

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function formatDate(value) {
  if (!value) return "No expiry";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDiscountStatus(discount) {
  if (discount.expired) {
    return {
      label: "Expired",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  }

  if (discount.active) {
    return {
      label: "Active",
      className:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }

  if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
    return {
      label: "Scheduled",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }

  return {
    label: "Disabled",
    className: "bg-white/5 text-neutral-500 border-white/10",
  };
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [showCreate, setShowCreate] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDiscounts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/discounts", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load discounts.");
      }

      setDiscounts(data.discounts || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load discounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiscounts();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function generateCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let generated = "";

    for (let i = 0; i < 8; i++) {
      generated += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    updateField("code", generated);
  }

  async function createDiscount(event) {
    event.preventDefault();

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          code: form.code.trim().toUpperCase(),
          value: Number(form.value),
          minimumOrder:
            form.minimumOrder === ""
              ? 0
              : Number(form.minimumOrder),
          maxUses:
            form.maxUses === ""
              ? null
              : Number(form.maxUses),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create discount.");
      }

      setDiscounts((current) => [
        data.discount,
        ...current,
      ]);

      setForm(EMPTY_FORM);
      setShowCreate(false);

      setSuccess("Discount created successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to create discount.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteDiscount(discount) {
    const confirmed = window.confirm(
      `Delete discount "${discount.code}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(discount.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/discounts/${encodeURIComponent(discount.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete discount.");
      }

      setDiscounts((current) =>
        current.filter((item) => item.id !== discount.id)
      );

      setSuccess("Discount deleted.");

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to delete discount.");
    } finally {
      setDeleting(null);
    }
  }

  const activeCount = useMemo(
    () => discounts.filter((discount) => discount.active).length,
    [discounts]
  );

  const scheduledCount = useMemo(
    () =>
      discounts.filter(
        (discount) =>
          discount.startsAt &&
          new Date(discount.startsAt) > new Date()
      ).length,
    [discounts]
  );

  const expiredCount = useMemo(
    () => discounts.filter((discount) => discount.expired).length,
    [discounts]
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px w-8 bg-white/30" />

              <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-neutral-500">
                Commerce
              </span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Discounts
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
              Create and manage promotional codes, seasonal offers,
              and customer incentives across VÉRANE.
            </p>
          </div>

          <button
            onClick={() => {
              setShowCreate(true);
              setError("");
            }}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-full
              bg-white
              px-6
              py-3
              text-sm
              font-semibold
              text-black
              transition
              hover:bg-neutral-200
              active:scale-[0.98]
            "
          >
            <span className="text-lg leading-none">+</span>
            Create Discount
          </button>
        </div>

        {/* FEEDBACK */}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* SUMMARY */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Total Codes"
            value={discounts.length}
          />

          <SummaryCard
            label="Active"
            value={activeCount}
          />

          <SummaryCard
            label="Scheduled"
            value={scheduledCount}
          />

          <SummaryCard
            label="Expired"
            value={expiredCount}
          />
        </div>

        {/* CREATE FORM */}
        {showCreate && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
              <div>
                <p className="text-sm font-semibold">
                  Create discount
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  Configure a new promotion for your customers.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="text-neutral-500 transition hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={createDiscount}
              className="p-6 sm:p-8"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                {/* NAME */}
                <Field
                  label="Campaign Name"
                  description="Internal name for this promotion."
                >
                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                    placeholder="Summer Collection Offer"
                    className={inputClass}
                  />
                </Field>

                {/* CODE */}
                <Field
                  label="Discount Code"
                  description="The code customers enter at checkout."
                >
                  <div className="flex gap-2">
                    <input
                      value={form.code}
                      onChange={(e) =>
                        updateField(
                          "code",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="VERANE10"
                      className={`${inputClass} flex-1`}
                    />

                    <button
                      type="button"
                      onClick={generateCode}
                      className="
                        shrink-0
                        rounded-xl
                        border
                        border-white/10
                        bg-white/5
                        px-4
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-wider
                        text-neutral-300
                        transition
                        hover:bg-white/10
                      "
                    >
                      Generate
                    </button>
                  </div>
                </Field>

                {/* TYPE */}
                <Field
                  label="Discount Type"
                  description="Choose percentage or fixed amount."
                >
                  <div className="grid grid-cols-2 gap-2">
                    <SelectButton
                      active={form.type === "percentage"}
                      onClick={() =>
                        updateField("type", "percentage")
                      }
                    >
                      Percentage
                    </SelectButton>

                    <SelectButton
                      active={form.type === "fixed"}
                      onClick={() =>
                        updateField("type", "fixed")
                      }
                    >
                      Fixed amount
                    </SelectButton>
                  </div>
                </Field>

                {/* VALUE */}
                <Field
                  label={
                    form.type === "percentage"
                      ? "Discount Percentage"
                      : "Discount Amount"
                  }
                  description={
                    form.type === "percentage"
                      ? "Maximum allowed is 100%."
                      : "Amount deducted from the order."
                  }
                >
                  <div className="relative">
                    {form.type === "fixed" && (
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                        ₦
                      </span>
                    )}

                    <input
                      value={form.value}
                      onChange={(e) =>
                        updateField("value", e.target.value)
                      }
                      type="number"
                      min="0"
                      max={
                        form.type === "percentage"
                          ? "100"
                          : undefined
                      }
                      step="0.01"
                      placeholder={
                        form.type === "percentage"
                          ? "10"
                          : "5000"
                      }
                      className={`${inputClass} ${
                        form.type === "fixed"
                          ? "pl-9"
                          : ""
                      }`}
                    />

                    {form.type === "percentage" && (
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                        %
                      </span>
                    )}
                  </div>
                </Field>

                {/* MINIMUM ORDER */}
                <Field
                  label="Minimum Order"
                  description="Optional minimum cart value."
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                      ₦
                    </span>

                    <input
                      value={form.minimumOrder}
                      onChange={(e) =>
                        updateField(
                          "minimumOrder",
                          e.target.value
                        )
                      }
                      type="number"
                      min="0"
                      placeholder="0"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </Field>

                {/* MAX USES */}
                <Field
                  label="Usage Limit"
                  description="Leave empty for unlimited usage."
                >
                  <input
                    value={form.maxUses}
                    onChange={(e) =>
                      updateField("maxUses", e.target.value)
                    }
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </Field>

                {/* START */}
                <Field
                  label="Start Date"
                  description="Optional scheduled start."
                >
                  <input
                    value={form.startsAt}
                    onChange={(e) =>
                      updateField("startsAt", e.target.value)
                    }
                    type="datetime-local"
                    className={inputClass}
                  />
                </Field>

                {/* EXPIRY */}
                <Field
                  label="Expiry Date"
                  description="Optional expiration date."
                >
                  <input
                    value={form.expiresAt}
                    onChange={(e) =>
                      updateField("expiresAt", e.target.value)
                    }
                    type="datetime-local"
                    className={inputClass}
                  />
                </Field>

                {/* DESCRIPTION */}
                <div className="lg:col-span-2">
                  <Field
                    label="Description"
                    description="Optional internal description."
                  >
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        updateField(
                          "description",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="10% off selected footwear for the summer campaign."
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>
              </div>

              {/* OPTIONS */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Enable discount"
                  description="Customers can use this code immediately."
                  enabled={form.enabled}
                  onClick={() =>
                    updateField(
                      "enabled",
                      !form.enabled
                    )
                  }
                />

                <Toggle
                  label="Allow stacking"
                  description="Allow this discount alongside other promotions."
                  enabled={form.stackable}
                  onClick={() =>
                    updateField(
                      "stackable",
                      !form.stackable
                    )
                  }
                />
              </div>

              {/* ACTIONS */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="
                    rounded-full
                    border
                    border-white/10
                    px-6
                    py-3
                    text-sm
                    font-medium
                    text-neutral-400
                    transition
                    hover:border-white/20
                    hover:text-white
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="
                    rounded-full
                    bg-white
                    px-7
                    py-3
                    text-sm
                    font-semibold
                    text-black
                    transition
                    hover:bg-neutral-200
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {creating
                    ? "Creating..."
                    : "Create Discount"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DISCOUNTS */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                Promotion codes
              </p>

              <p className="mt-1 text-xs text-neutral-600">
                Manage every promotional code created for VÉRANE.
              </p>
            </div>

            <span className="text-xs text-neutral-600">
              {discounts.length}{" "}
              {discounts.length === 1 ? "code" : "codes"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl border border-white/5 bg-neutral-950"
                />
              ))}
            </div>
          ) : discounts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-neutral-950/50 px-6 py-20 text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-xl text-neutral-500">
                %
              </div>

              <h2 className="text-sm font-semibold">
                No discounts yet
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-neutral-600">
                Create your first promotional code to start
                rewarding VÉRANE customers.
              </p>

              <button
                onClick={() => setShowCreate(true)}
                className="mt-6 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-neutral-200"
              >
                Create your first discount
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {discounts.map((discount) => {
                const status = getDiscountStatus(discount);

                return (
                  <div
                    key={discount.id}
                    className="
                      group
                      rounded-2xl
                      border
                      border-white/10
                      bg-neutral-950
                      p-5
                      transition
                      hover:border-white/20
                    "
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-lg border border-white/10 bg-black px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-white">
                            {discount.code}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-3">
                          <p className="text-sm font-medium text-neutral-200">
                            {discount.name || discount.code}
                          </p>

                          {discount.description && (
                            <p className="mt-1 max-w-2xl text-xs text-neutral-600">
                              {discount.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:min-w-[500px]">
                        <Detail
                          label="Value"
                          value={
                            discount.type === "fixed"
                              ? formatCurrency(discount.value)
                              : `${discount.value}%`
                          }
                        />

                        <Detail
                          label="Used"
                          value={`${discount.usedCount || 0}${
                            discount.maxUses
                              ? ` / ${discount.maxUses}`
                              : ""
                          }`}
                        />

                        <Detail
                          label="Minimum"
                          value={
                            discount.minimumOrder
                              ? formatCurrency(
                                  discount.minimumOrder
                                )
                              : "None"
                          }
                        />

                        <Detail
                          label="Expires"
                          value={formatDate(
                            discount.expiresAt
                          )}
                        />
                      </div>

                      <div className="flex items-center gap-2 lg:shrink-0">
                        <button
                          onClick={() =>
                            deleteDiscount(discount)
                          }
                          disabled={deleting === discount.id}
                          className="
                            rounded-full
                            border
                            border-red-500/10
                            px-4
                            py-2
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-wider
                            text-red-400
                            transition
                            hover:border-red-500/20
                            hover:bg-red-500/5
                            disabled:opacity-40
                          "
                        >
                          {deleting === discount.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
      <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-neutral-600">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {Number(value || 0).toLocaleString("en-NG")}
      </p>
    </div>
  );
}

function Field({ label, description, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-neutral-300">
        {label}
      </label>

      {description && (
        <p className="mb-3 text-[10px] text-neutral-600">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-medium text-neutral-300">
        {value}
      </p>
    </div>
  );
}

function SelectButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-xl
        border
        px-4
        py-3
        text-xs
        font-medium
        transition
        ${
          active
            ? "border-white/30 bg-white/10 text-white"
            : "border-white/10 bg-black text-neutral-500 hover:border-white/20 hover:text-neutral-300"
        }
      `}
    >
      {children}
    </button>
  );
}

function Toggle({
  label,
  description,
  enabled,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex
        items-center
        justify-between
        gap-4
        rounded-2xl
        border
        border-white/10
        bg-black
        p-4
        text-left
        transition
        hover:border-white/20
      "
    >
      <div>
        <p className="text-xs font-medium text-neutral-300">
          {label}
        </p>

        <p className="mt-1 text-[10px] leading-4 text-neutral-600">
          {description}
        </p>
      </div>

      <span
        className={`
          relative
          h-6
          w-11
          shrink-0
          rounded-full
          transition
          ${
            enabled
              ? "bg-white"
              : "bg-white/10"
          }
        `}
      >
        <span
          className={`
            absolute
            top-1
            h-4
            w-4
            rounded-full
            transition
            ${
              enabled
                ? "left-6 bg-black"
                : "left-1 bg-neutral-500"
            }
          `}
        />
      </span>
    </button>
  );
}

const inputClass = `
  w-full
  rounded-xl
  border
  border-white/10
  bg-black
  px-4
  py-3
  text-sm
  text-white
  outline-none
  transition
  placeholder:text-neutral-700
  focus:border-white/30
  focus:ring-1
  focus:ring-white/10
`;