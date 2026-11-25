"use client";

/**
 * Made to Order costs (the API's GET /m2o/pricing): an M2O fee per diamond plus
 * a price per carat by size band, for all standard shapes. They are dealer
 * prices, so they are fetched for signed-in people only and never built into
 * the site's code. The estimate is what the form shows beside a size; Surreal
 * confirms the price after each request.
 */

import { useCallback, useEffect, useState } from "react";
import { API_AUTH, apiFetch, type ApiResponse } from "@/lib/api/client";

export type M2OPricing = ApiResponse<"/api/v1/m2o/pricing", "get">;
export type M2OBand = M2OPricing["bands"][number];

export type M2OPricingState =
  | { status: "signed-out" }
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; pricing: M2OPricing };

/** The cost table, loaded once someone is signed in. */
export function useM2OPricing(signedIn: boolean): M2OPricingState {
  const [pricing, setPricing] = useState<M2OPricing | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn || !API_AUTH || pricing) return;
    let live = true;
    apiFetch<M2OPricing>("/m2o/pricing")
      .then((p) => live && setPricing(p))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [signedIn, pricing, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (!signedIn) return { status: "signed-out" };
  // The preview build signs in inside the browser only, with no API to ask.
  if (!API_AUTH) return { status: "unavailable" };
  if (pricing) return { status: "ready", pricing };
  if (failed) return { status: "error", retry };
  return { status: "loading" };
}

/** Whole hundredths of a carat, so 2.37 ct never becomes 2.3699999. */
const hundredths = (carat: number) => Math.round(carat * 100);

export function bandFor(pricing: M2OPricing, carat: number): M2OBand | null {
  const h = hundredths(carat);
  return pricing.bands.find((b) => h >= hundredths(b.fromCarat) && h <= hundredths(b.toCarat)) ?? null;
}

export type M2OEstimate =
  | { ok: true; carat: number; band: M2OBand; diamondCents: number; feeCents: number; totalCents: number }
  | { ok: false; reason: "size" | "outside" | "shape" | "dimensions" };

/** The estimate for a request: the diamond at its band's price per carat, plus the M2O fee. */
export function m2oEstimate(pricing: M2OPricing, input: { carat: number; shape: string; byDimensions: boolean }): M2OEstimate {
  if (input.byDimensions) return { ok: false, reason: "dimensions" };
  if (input.shape === "other") return { ok: false, reason: "shape" };
  if (!(input.carat > 0)) return { ok: false, reason: "size" };
  const band = bandFor(pricing, input.carat);
  if (!band) return { ok: false, reason: "outside" };
  const diamondCents = Math.round((hundredths(input.carat) * band.perCaratCents) / 100);
  return { ok: true, carat: hundredths(input.carat) / 100, band, diamondCents, feeCents: pricing.feeCents, totalCents: diamondCents + pricing.feeCents };
}

/** The table's size range, for "sizes from 1.00 to 5.99 ct". */
export const caratRange = (pricing: M2OPricing) => ({
  from: Math.min(...pricing.bands.map((b) => b.fromCarat)),
  to: Math.max(...pricing.bands.map((b) => b.toCarat)),
});

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
/** $520.00, or $520 with whole. */
export const formatCents = (cents: number, { whole = false } = {}) => (whole ? usdWhole : usd).format(cents / 100);
export const formatCarat = (carat: number) => carat.toFixed(2);
