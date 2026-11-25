"use client";

/**
 * Made to Order (M2O) request (BRD R-19), entered from the diamond page with
 * the search carried in (query.ts m2oHref): shape, size (and cmax for
 * reference), color and clarity ranges, cut, polish, symmetry, fluor, dims,
 * table, depthpct, ratio, and from for a stone. Every one prefills its field
 * and can be changed; a line above the form says what came from the search,
 * and the sent request keeps the grades as one line. The fields are the live
 * M2O form's (your name, company, customer name for the booklet, phone,
 * email, exact size, shape, length to width ratio, girdle inscription,
 * notes) plus dimensions, prefilled from the search and the dealer session.
 * Labels and placeholders come from src/content/m2o.ts, which Surreal's
 * specification replaces (C-17). A size or dimensions is required, and the
 * grade promise for the size shows under it. Beside the form, the program
 * as the live site states it, and Diamond Legacy. A signed-in dealer sends the
 * request (kept in this browser for the preview, with a request number); a
 * visitor is asked to log in first. Whether M2O stays a page of its own or
 * lives inside the diamond page is Q7.
 *
 * Around the form, Surreal's own M2O page (November 2026), in this order: the
 * hero, the M2O costs, the form, how it works, the nine touchpoints and sizes
 * that mean something (M2OSections.tsx), each revealed once as it arrives
 * (useM2OMotion.ts). Every section runs its own motion, after its own part of
 * the page has hydrated: the form sits in a Suspense boundary, and touching it
 * from outside before then would make React's hydration fail. Beside the form, a signed-in dealer sees an estimate from
 * the cost table (the M2O fee plus the price per carat), which Surreal
 * confirms. A link from the diamond search lands on the form (#request).
 */

import Link from "next/link";
import { Suspense, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import SiteChrome from "@/components/chrome/SiteChrome";
import ContactDrawer from "@/components/chrome/ContactDrawer";
import Footer from "@/components/sections/Footer";
import ShapeIcon from "@/components/brand/ShapeIcon";
import { CLARITIES, COLORS, FLUORESCENCE, GRADES, SHAPE_LABEL, stoneById, stoneTitle, type StoneShape } from "@/content/diamonds";
import { account, brand } from "@/content/site";
import { M2O_FIELDS, M2O_GRADES, M2O_SHAPES, m2oGrade, type M2OField, type M2OGradeField } from "@/content/m2o";
import { useDealer } from "@/lib/dealer";
import { caratRange, formatCarat, formatCents, m2oEstimate, useM2OPricing, type M2OEstimate, type M2OPricingState } from "@/lib/m2oPricing";
import { m2oRequests as requests, m2oSize, type M2ORequest } from "@/lib/requests";
import { M2OCosts, M2OHero, M2OIdeas, M2OStory, M2OTerms } from "./M2OSections";
import { useM2OMotion } from "./useM2OMotion";
import s from "./m2o.module.css";

type Field = M2OField;

/** A grade range from the address ("D-F" or "E"), checked against its scale; "" when absent or not on it. */
function rangeParam(scale: readonly string[], raw: string | null | undefined): string {
  if (!raw) return "";
  const [a, b = a] = raw.toUpperCase().split("-");
  const i = scale.indexOf(a);
  const j = scale.indexOf(b);
  if (i < 0 || j < 0) return "";
  return i === j ? scale[i] : `${scale[Math.min(i, j)]}-${scale[Math.max(i, j)]}`;
}
const oneOf = (scale: readonly string[], raw: string | null | undefined) => (raw && scale.includes(raw) ? raw : "");
/** "57-62" reads as "57 to 62" in a text field. */
const words = (raw: string | null | undefined) => (raw ?? "").replace("-", " to ");

/** The grades and proportions asked for, as one line for the summary and the sent request. */
function specOf(f: Record<Field, string>): string {
  const grade = (v: string, name: string) => (v ? (v === "Ideal" ? `Ideal ${name}` : `${v} ${name} or better`) : "");
  return [
    f.color ? `${words(f.color)} color` : "",
    f.clarity ? `${words(f.clarity)} clarity` : "",
    grade(f.cut, "cut"),
    grade(f.polish, "polish"),
    grade(f.symmetry, "symmetry"),
    f.fluorescence ? (f.fluorescence === "None" ? "no fluorescence" : `${f.fluorescence} fluorescence or less`) : "",
    f.table ? `table ${f.table}%` : "",
    f.depthPct ? `depth ${f.depthPct}%` : "",
    f.ratio ? `ratio ${f.ratio}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export default function MadeToOrderPage() {
  return (
    <>
      <SiteChrome />
      <ContactDrawer />
      <main id="main">
        <M2OBody />
        <Footer />
      </main>
    </>
  );
}

function M2OBody() {
  const dealer = useDealer();
  const pricing = useM2OPricing(Boolean(dealer));
  return (
    <>
      <M2OHero />
      <M2OCosts state={pricing} />
      <Suspense fallback={<Request params={null} pricing={pricing} />}>
        <WithParams pricing={pricing} />
      </Suspense>
      <M2OTerms />
      <M2OStory />
      <M2OIdeas />
    </>
  );
}

function WithParams({ pricing }: { pricing: M2OPricingState }) {
  const params = useSearchParams();
  return <Request params={params} pricing={pricing} />;
}

/** Beside the form: the estimate from the cost table, or what stands in for it. */
function EstimateCard({ state, estimate }: { state: M2OPricingState; estimate: M2OEstimate | null }) {
  const message =
    state.status === "signed-out"
      ? "Log in to see an estimate from the M2O cost table."
      : state.status === "unavailable"
        ? "Estimates show on the live site, where the cost table loads for signed-in dealers."
        : state.status === "loading"
          ? "Loading the M2O costs."
          : state.status === "error"
            ? "The M2O costs could not be loaded. The estimate shows once they do."
            : estimate && !estimate.ok
              ? estimate.reason === "dimensions"
                ? "Ordering by dimensions: Surreal confirms the carat weight and the price."
                : estimate.reason === "shape"
                  ? "Shapes outside the standard six are quoted by Surreal."
                  : estimate.reason === "outside"
                    ? `Sizes outside ${formatCarat(caratRange(state.pricing).from)} to ${formatCarat(caratRange(state.pricing).to)} ct are quoted by Surreal.`
                    : "Enter the exact size in carats to see an estimate."
              : "";
  return (
    <div className={s.estimate} data-palette="brand" aria-live="polite">
      <p className={s.estimateTitle}>Your estimate</p>
      {estimate?.ok ? (
        <>
          <dl className={s.estimateLines}>
            <div>
              <dt>
                Diamond, {formatCarat(estimate.carat)} ct at {formatCents(estimate.band.perCaratCents, { whole: true })} per carat
              </dt>
              <dd>{formatCents(estimate.diamondCents)}</dd>
            </div>
            <div>
              <dt>M2O fee</dt>
              <dd>{formatCents(estimate.feeCents)}</dd>
            </div>
            <div className={s.estimateTotal}>
              <dt>Estimate</dt>
              <dd key={estimate.totalCents} className={s.totalTick}>
                {formatCents(estimate.totalCents)}
              </dd>
            </div>
          </dl>
          <p className={s.estimateNote}>Surreal confirms the price after your request.</p>
        </>
      ) : (
        <p className={s.estimateNote}>{message}</p>
      )}
      {state.status === "error" && (
        <button type="button" className={s.textBtn} onClick={state.retry}>
          Try again
        </button>
      )}
      {state.status === "ready" && (
        <a href="#costs" className={s.textBtn}>
          See the cost table
        </a>
      )}
    </div>
  );
}

function Request({ params, pricing }: { params: URLSearchParams | null; pricing: M2OPricingState }) {
  const dealer = useDealer();
  const sectionRef = useRef<HTMLElement>(null);
  useM2OMotion(sectionRef);
  const from = params?.get("from") ? stoneById(params.get("from") as string) : undefined;
  const qShape = params?.get("shape") as StoneShape | null;
  const qSize = params?.get("size") ?? "";
  const qDims = params?.get("dims") ?? "";
  const [values, setValues] = useState<Record<Field, string> | null>(null);
  /* The size is asked one way or the other: an exact carat weight, or the dimensions (client change request, November 2026). A search with measurements and no carat opens on dimensions. */
  const [sizeBy, setSizeBy] = useState<"carat" | "dimensions">(() => (!qSize && qDims ? "dimensions" : "carat"));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sent, setSent] = useState<M2ORequest | null>(null);

  const initial: Record<Field, string> = {
    name: dealer?.contact ?? "",
    company: dealer?.store ?? "",
    customer: "",
    phone: "",
    email: dealer?.email ?? "",
    size: qSize,
    dimensions: qSize ? "" : qDims,
    shape: qShape && M2O_SHAPES.includes(qShape) ? qShape : qShape ? "other" : "",
    otherShape: qShape && !M2O_SHAPES.includes(qShape) ? (SHAPE_LABEL[qShape] ?? "") : "",
    ratio: words(params?.get("ratio")),
    color: rangeParam(COLORS, params?.get("color")),
    clarity: rangeParam(CLARITIES, params?.get("clarity")),
    cut: oneOf(GRADES, params?.get("cut")),
    polish: oneOf(GRADES, params?.get("polish")),
    symmetry: oneOf(GRADES, params?.get("symmetry")),
    fluorescence: oneOf(FLUORESCENCE, params?.get("fluor")),
    table: words(params?.get("table")),
    depthPct: words(params?.get("depthpct")),
    inscription: "",
    // What the form has no field for still travels: the stone it is like, its measurements beside a carat size, and the top of a carat range.
    notes: [
      from ? `Like stock ${from.id}, ${stoneTitle(from)}` : "",
      qSize && qDims ? `Measurements ${qDims} mm` : "",
      params?.get("cmax") ? `Searched ${qSize} to ${params.get("cmax")} ct` : "",
    ]
      .filter(Boolean)
      .join(". "),
  };
  const form: Record<Field, string> = values ?? initial;
  const searchSpec = [qShape ? (SHAPE_LABEL[qShape] ?? qShape) : "", qSize ? `${qSize} ct` : qDims ? `${qDims} mm` : "", specOf(initial)].filter(Boolean).join(", ");
  const set = (k: Field, v: string) => setValues({ ...form, [k]: v });
  const shapeForIcon = (M2O_SHAPES.includes(form.shape as StoneShape) ? form.shape : qShape ?? "oval") as StoneShape;
  const estimate = pricing.status === "ready" ? m2oEstimate(pricing.pricing, { carat: Number(form.size), shape: form.shape, byDimensions: sizeBy === "dimensions" }) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found: Partial<Record<Field, string>> = {};
    if (!form.name.trim()) found.name = "Enter your name.";
    if (!form.company.trim()) found.company = "Enter the company name.";
    if (form.phone.replace(/\D/g, "").length < 10) found.phone = "Enter a ten digit phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) found.email = "Enter a valid email address.";
    if (sizeBy === "carat" && !(Number(form.size) > 0)) found.size = "Enter the exact size in carats.";
    if (sizeBy === "dimensions" && !/\d/.test(form.dimensions)) found.dimensions = "Enter the dimensions in millimetres.";
    if (!form.shape) found.shape = "Choose a shape.";
    if (form.shape === "other" && !form.otherShape.trim()) found.otherShape = "Name the shape.";
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`m-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    const request: M2ORequest = {
      number: `M2O-${String(Date.now()).slice(-6)}`,
      shape: form.shape === "other" ? form.otherShape.trim() : form.shape,
      size: sizeBy === "carat" ? form.size : "",
      dimensions: sizeBy === "dimensions" ? form.dimensions.trim() : undefined,
      spec: specOf(form) || undefined,
      estimateCents: estimate?.ok ? estimate.totalCents : undefined,
      sentAt: new Date().toISOString(),
    };
    requests.set((list) => [request, ...list]);
    setSent(request);
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const input = (k: Exclude<Field, "shape" | "notes" | M2OGradeField>, extraHint?: string) => {
    const opts = M2O_FIELDS[k];
    const hint = extraHint ?? opts.hint;
    return (
      <label className={`${s.field} ${opts.wide ? s.wide : ""}`}>
        <span className={s.label}>
          {opts.label}
          {opts.optional && <span className={s.optional}> (optional)</span>}
        </span>
        <input
          id={`m-${k}`}
          className={s.input}
          type={opts.type ?? "text"}
          step={opts.step}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
          inputMode={opts.type === "number" ? "decimal" : undefined}
          value={form[k]}
          onChange={(e) => set(k, e.target.value)}
          aria-invalid={Boolean(errors[k])}
          aria-describedby={errors[k] ? `me-${k}` : hint ? `mh-${k}` : undefined}
        />
        {hint && !errors[k] && (
          <span id={`mh-${k}`} className={s.hint}>
            {hint}
          </span>
        )}
        {errors[k] && (
          <span id={`me-${k}`} className={s.error}>
            {errors[k]}
          </span>
        )}
      </label>
    );
  };

  const gradeField = (g: (typeof M2O_GRADES)[number]) => {
    if (g.id === "color" || g.id === "clarity") {
      const scale: readonly string[] = g.id === "color" ? COLORS : CLARITIES;
      const [best, low = best] = form[g.id] ? form[g.id].split("-") : ["", ""];
      const id = g.id;
      return (
        <div key={id} className={s.field}>
          <span className={s.label} id={`ml-${id}`}>
            {g.label}
            <span className={s.optional}> (optional)</span>
          </span>
          <div className={s.rangeRow} role="group" aria-labelledby={`ml-${id}`}>
            <select
              className={s.select}
              aria-label={`${g.label}, best`}
              value={best}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return set(id, "");
                const to = low && scale.indexOf(low) >= scale.indexOf(v) ? low : v;
                set(id, to === v ? v : `${v}-${to}`);
              }}
            >
              <option value="">Any</option>
              {scale.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <span className={s.rangeTo}>to</span>
            <select className={s.select} aria-label={`${g.label}, lowest`} value={low} disabled={!best} onChange={(e) => set(id, e.target.value === best ? best : `${best}-${e.target.value}`)}>
              {!best && <option value="">Any</option>}
              {scale
                .filter((x) => !best || scale.indexOf(x) >= scale.indexOf(best))
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
          </div>
        </div>
      );
    }
    const options: [string, string][] =
      g.id === "fluorescence" ? FLUORESCENCE.map((f) => [f, f === "None" ? "None" : `${f} or less`]) : GRADES.map((x, i) => [x, i === 0 ? x : `${x} or better`]);
    return (
      <label key={g.id} className={s.field}>
        <span className={s.label}>
          {g.label}
          <span className={s.optional}> (optional)</span>
        </span>
        <select className={s.select} value={form[g.id]} onChange={(e) => set(g.id, e.target.value)}>
          <option value="">No preference</option>
          {options.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        {g.hint && <span className={s.hint}>{g.hint}</span>}
      </label>
    );
  };

  return (
    <section ref={sectionRef} id="request" className={s.section} aria-labelledby="m2o-request">
      <div className={s.wrap}>
        <div className={s.layout}>
          <div className={s.main}>
            <p className={s.eyebrow} data-rise>
              Your request
            </p>
            <h2 id="m2o-request" className={s.h2} data-split>
              Request an <em>M2O diamond</em>
            </h2>
            <p className={s.lead} data-rise>Tell us the stone: any shape, in any carat weight, size or dimensions. After you send the request, Surreal contacts you to confirm the price.</p>

            {sent ? (
              <div className={s.sent} role="status">
                <span className={s.tick} aria-hidden>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5 10 17l9-10" />
                  </svg>
                </span>
                <p className={s.sentNumber}>{sent.number}</p>
                <p>
                  Request sent for a {m2oSize(sent)} {(SHAPE_LABEL[sent.shape as StoneShape] ?? sent.shape).toLowerCase()}. Surreal contacts you to confirm the
                  specification, the price and the delivery date. Questions: {brand.office.phone}.
                </p>
                {sent.spec && <p className={s.specLine}>Asked for: {sent.spec}.</p>}
                {sent.estimateCents !== undefined && <p className={s.specLine}>Estimate: {formatCents(sent.estimateCents)}, the M2O fee included. Surreal confirms the price.</p>}
                <p className={s.previewNote}>Preview: the request is kept in this browser; request emails connect with the dealer platform.</p>
                <div className={s.doors}>
                  <Link href="/diamonds" className={s.primary}>
                    Back to the search
                  </Link>
                  <button
                    type="button"
                    className={s.secondary}
                    onClick={() => {
                      setSent(null);
                      setValues(null);
                      setSizeBy("carat");
                    }}
                  >
                    Another request
                  </button>
                </div>
              </div>
            ) : (
              <form className={s.form} onSubmit={submit} noValidate>
                {searchSpec && (
                  <p className={s.prefill}>
                    <ShapeIcon shape={shapeForIcon} className={s.prefillIcon} />
                    <span>
                      Filled in from your {from ? `stone, stock ${from.id}` : "diamond search"}: {searchSpec}. Change anything below.
                    </span>
                  </p>
                )}
                <fieldset className={s.group}>
                  <legend className={s.legend}>The stone</legend>
                  <div className={s.shapeRow} role="radiogroup" aria-label="Shape">
                    {M2O_SHAPES.map((sh) => (
                      <button key={sh} type="button" role="radio" aria-checked={form.shape === sh} className={s.shapeBtn} onClick={() => set("shape", sh)}>
                        <ShapeIcon shape={sh} className={s.shapeIcon} />
                        {sh === "emerald" ? "Emerald Cut" : sh === "pear" ? "Pear Shape" : SHAPE_LABEL[sh]}
                      </button>
                    ))}
                    <button type="button" role="radio" aria-checked={form.shape === "other"} className={s.shapeBtn} onClick={() => set("shape", "other")}>
                      <span className={s.otherIcon} aria-hidden>
                        +
                      </span>
                      Other
                    </button>
                  </div>
                  {errors.shape && <span className={s.error}>{errors.shape}</span>}
                  <div className={s.grid}>
                    {form.shape === "other" && input("otherShape")}
                    <div className={`${s.field} ${s.wide}`}>
                      <span className={s.label} id="m-size-by">
                        Order by
                      </span>
                      <div className={s.sizeBy} role="radiogroup" aria-labelledby="m-size-by">
                        {(
                          [
                            ["carat", "Carat size"],
                            ["dimensions", "Dimensions"],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={sizeBy === id}
                            className={s.sizeByBtn}
                            onClick={() => {
                              setSizeBy(id);
                              // One or the other: the field set aside is cleared, with its error.
                              setValues({ ...form, [id === "carat" ? "dimensions" : "size"]: "" });
                              setErrors((e) => ({ ...e, size: undefined, dimensions: undefined }));
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {sizeBy === "carat" ? input("size", Number(form.size) > 0 ? m2oGrade(Number(form.size)) : undefined) : input("dimensions")}
                    {input("ratio")}
                    {input("inscription")}
                  </div>
                </fieldset>
                <fieldset className={s.group}>
                  <legend className={s.legend}>Grades and proportions</legend>
                  <div className={s.grid}>
                    {M2O_GRADES.map(gradeField)}
                    {input("table")}
                    {input("depthPct")}
                  </div>
                </fieldset>
                <fieldset className={s.group}>
                  <legend className={s.legend}>For the booklet and your store</legend>
                  <div className={s.grid}>
                    {input("customer")}
                    {input("name")}
                    {input("company")}
                    {input("phone")}
                    {input("email")}
                    <label className={`${s.field} ${s.wide}`}>
                      <span className={s.label}>
                        {M2O_FIELDS.notes.label}
                        <span className={s.optional}> (optional)</span>
                      </span>
                      <textarea className={s.textarea} rows={3} placeholder={M2O_FIELDS.notes.placeholder} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                    </label>
                  </div>
                </fieldset>
                <div className={s.doors}>
                  {dealer ? (
                    <button type="submit" className={s.primary}>
                      Send the M2O request
                    </button>
                  ) : (
                    <Link href={`${account.login}?next=${encodeURIComponent("/diamonds/made-to-order")}`} className={s.primary}>
                      Log in to send
                    </Link>
                  )}
                  <Link href="/diamonds" className={s.secondary}>
                    Back to the search
                  </Link>
                </div>
              </form>
            )}
          </div>

          <aside className={s.side} aria-label="Your estimate">
            <EstimateCard state={pricing} estimate={estimate} />
            <p className={s.sideContact}>
              Questions about a request? Call <a href={brand.office.phoneHref}>{brand.office.phone}</a>, {brand.office.hours}.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
