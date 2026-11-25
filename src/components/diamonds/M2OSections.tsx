"use client";

/**
 * The Made to Order page around the request form, from Surreal's own M2O page
 * (content, photographs and the cost table, at Surreal's request, November
 * 2026). In page order: the hero with the M2O mark, the M2O costs (signed-in
 * dealers only, from the API), then the request form (MadeToOrderPage), how
 * it works, the nine touchpoints and the brochure, and sizes that mean
 * something. Open layouts on hairlines rather than boxed cards; the motion is
 * in useM2OMotion.ts.
 */

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { account } from "@/content/site";
import { M2O_BROCHURE, M2O_IDEAS, M2O_SAMPLE_BROCHURE, M2O_TERMS, M2O_TOUCHPOINTS } from "@/content/m2o";
import { SHAPE_LABEL, type StoneShape } from "@/content/diamonds";
import { bandFor, caratRange, formatCarat, formatCents, type M2OPricingState } from "@/lib/m2oPricing";
import { useM2OBars, useM2OMotion } from "./useM2OMotion";
import s from "./m2o.module.css";

const Arrow = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const External = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
  </svg>
);
const Diamond = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 10 10" width="9" height="9" className={className}>
    <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="currentColor" />
  </svg>
);

/** Surreal's M2O mark (Introducing M2O, Made to Order Diamonds), set in type so it stays sharp in both themes. */
export function M2OMark({ className = "" }: { className?: string }) {
  return (
    <p className={`${s.mark} ${className}`} role="img" aria-label="M2O, Made to Order Diamonds">
      <span className={s.markTop} aria-hidden>
        Introducing
      </span>
      <span className={s.markName} aria-hidden>
        M<span className={s.markTwo}>2</span>O
      </span>
      <span className={s.markBottom} aria-hidden>
        Made to Order Diamonds
      </span>
    </p>
  );
}

export function M2OHero() {
  return (
    <section className={s.hero} aria-labelledby="m2o-title">
      <div className={s.wrap}>
        <nav aria-label="Breadcrumb" className={s.crumbs}>
          <Link href="/">Home</Link>
          <span aria-hidden>/</span>
          <Link href="/diamonds">Lab Diamond Search</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Made to Order</span>
        </nav>
        <div className={s.heroGrid}>
          <div className={s.heroText}>
            <M2OMark />
            <h1 id="m2o-title" className={s.title}>
              A diamond grown <em>for one client</em>
            </h1>
            <p className={s.lead}>
              Order any diamond shape in any carat weight, size or dimensions, and we grow it to your specification. Exclusively for Surreal dealers.
            </p>
            <ul className={s.heroFacts}>
              <li>
                <strong>6 to 8 weeks</strong>
                <span>from the confirmed order</span>
              </li>
              <li>
                <strong>IGI</strong>
                <span>grading certificate</span>
              </li>
              <li>
                <strong>9 touchpoints</strong>
                <span>tracked in its brochure</span>
              </li>
            </ul>
            <div className={s.doors}>
              <a href="#request" className={s.primary}>
                Start a request
              </a>
              <a href="#costs" className={s.secondary}>
                See the costs
              </a>
            </div>
          </div>
          <div className={s.heroVisual}>
            <Image src="/media/m2o/m2o-tweezers.webp" alt="A round brilliant diamond held in tweezers beside a measuring scale" fill priority sizes="(min-width: 1024px) 44vw, 100vw" />
          </div>
        </div>
      </div>
    </section>
  );
}

const shapeList = (shapes: string[]) => {
  const names = shapes.map((sh) => (SHAPE_LABEL[sh as StoneShape] ?? sh).toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
};

/** The cost table: for signed-in dealers, from the API; a log in prompt over a faint table for everyone else. */
export function M2OCosts({ state }: { state: M2OPricingState }) {
  const ready = state.status === "ready" ? state.pricing : null;
  const sectionRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  useM2OMotion(sectionRef);
  useM2OBars(tableRef, Boolean(ready));
  const example = ready ? bandFor(ready, 2) : null;
  const top = ready ? Math.max(...ready.bands.map((b) => b.perCaratCents)) : 1;

  return (
    <section ref={sectionRef} id="costs" className={s.costs} aria-labelledby="m2o-costs">
      <div className={s.wrap}>
        <div className={s.costsGrid}>
          <div className={s.costsText}>
            <p className={s.eyebrow} data-rise>
              M2O costs
            </p>
            <h2 id="m2o-costs" className={s.h2} data-split>
              Priced <em>by the carat</em>
            </h2>
            <p className={s.body} data-rise>
              {ready
                ? `Every M2O diamond carries an M2O fee of ${formatCents(ready.feeCents, { whole: true })}, plus the cost of the diamond at the price per carat for its size. The table covers all standard shapes: ${shapeList(ready.standardShapes)}.`
                : "Every M2O diamond carries an M2O fee, plus the cost of the diamond at a price per carat for its size."}{" "}
              Surreal confirms the price after your request.
            </p>
            <p className={s.formula} data-rise aria-hidden={!ready}>
              <span>
                <strong>{ready ? formatCents(ready.feeCents, { whole: true }) : "Fee"}</strong>
                M2O fee
              </span>
              <span className={s.formulaOp}>+</span>
              <span>
                <strong>ct × rate</strong>
                carat weight at its price per carat
              </span>
            </p>
            {ready && example && (
              <p className={s.costNote} data-rise>
                A 2.00 ct round: 2.00 × {formatCents(example.perCaratCents, { whole: true })} = {formatCents(2 * example.perCaratCents, { whole: true })}, plus the{" "}
                {formatCents(ready.feeCents, { whole: true })} fee, comes to {formatCents(2 * example.perCaratCents + ready.feeCents, { whole: true })}.
              </p>
            )}
          </div>

          <div ref={tableRef} className={s.costTableWrap}>
            {ready ? (
              <>
                <table className={s.costTable}>
                  <caption className={s.srOnly}>M2O cost per carat by size, for all standard shapes, before the M2O fee</caption>
                  <thead>
                    <tr>
                      <th scope="col">Carat weight</th>
                      <th scope="col" className={s.barHead}>
                        <span className={s.srOnly}>Price compared</span>
                      </th>
                      <th scope="col">Per carat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ready.bands.map((b) => (
                      <tr key={b.fromCarat} data-row>
                        <td>
                          {formatCarat(b.fromCarat)} to {formatCarat(b.toCarat)} ct
                        </td>
                        <td className={s.barCell} aria-hidden>
                          <span className={s.bar} data-bar style={{ width: `${Math.round((b.perCaratCents / top) * 100)}%` }} />
                        </td>
                        <td>{formatCents(b.perCaratCents, { whole: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr data-row>
                      <th scope="row" colSpan={2}>
                        M2O fee, per diamond
                      </th>
                      <td>{formatCents(ready.feeCents, { whole: true })}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className={s.costNote}>
                  Other shapes, and sizes outside {formatCarat(caratRange(ready).from)} to {formatCarat(caratRange(ready).to)} ct, are quoted by Surreal.
                </p>
              </>
            ) : (
              <div className={s.costGhost}>
                <div className={s.ghostRows} aria-hidden data-busy={state.status === "loading" ? "true" : undefined}>
                  {[62, 66, 73, 76, 81, 88, 94].map((w) => (
                    <span key={w}>
                      <i />
                      <b style={{ width: `${w}%` }} />
                      <i />
                    </span>
                  ))}
                </div>
                <div className={s.ghostMessage} role={state.status === "error" ? "alert" : undefined}>
                  {state.status === "loading" ? (
                    <p className={s.ghostTitle}>Loading the M2O costs</p>
                  ) : state.status === "error" ? (
                    <>
                      <p className={s.ghostTitle}>The M2O costs could not be loaded</p>
                      <p>Check your connection and try again.</p>
                      <button type="button" className={s.secondary} onClick={state.retry}>
                        Try again
                      </button>
                    </>
                  ) : state.status === "unavailable" ? (
                    <>
                      <p className={s.ghostTitle}>Costs load from the live site</p>
                      <p>This preview has no server to ask, so the cost table shows once you are signed in on the live site.</p>
                    </>
                  ) : (
                    <>
                      <span className={s.lock} aria-hidden>
                        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="7" width="10" height="7" rx="1.5" />
                          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                        </svg>
                      </span>
                      <p className={s.ghostTitle}>M2O costs are for Surreal dealers</p>
                      <p>Log in to see the M2O fee and the price per carat for every size, with an estimate beside your request.</p>
                      <div className={s.doors}>
                        <Link href={`${account.login}?next=${encodeURIComponent("/diamonds/made-to-order")}`} className={s.primary}>
                          Log in
                        </Link>
                        <Link href={account.apply} className={s.secondary}>
                          Become a dealer
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function M2OTerms() {
  const ref = useRef<HTMLElement>(null);
  useM2OMotion(ref);
  return (
    <section ref={ref} className={s.terms} aria-labelledby="m2o-how">
      <div className={s.wrap}>
        <div className={s.termsGrid}>
          <div className={s.termsAside}>
            <p className={s.eyebrow} data-rise>
              How it works
            </p>
            <h2 id="m2o-how" className={s.h2} data-split>
              Any diamond, <em>grown to order</em>
            </h2>
            <div className={s.termsVisual} data-reveal-img>
              <Image src="/media/m2o/m2o-stone.webp" alt="A round brilliant diamond on black, measured to the hundredth" fill sizes="(min-width: 1024px) 30vw, 100vw" />
            </div>
          </div>
          <dl className={s.termList}>
            {M2O_TERMS.map((t) => (
              <div key={t.title} className={s.termRow} data-rise>
                <dt>
                  <Diamond className={s.termMark} />
                  {t.title}
                </dt>
                <dd>{t.line}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function M2OStory() {
  const ref = useRef<HTMLElement>(null);
  useM2OMotion(ref);
  return (
    <section ref={ref} className={s.story} data-palette="brand" aria-labelledby="m2o-story">
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow} data-rise>
            Its story, in a brochure
          </p>
          <h2 id="m2o-story" className={s.h2} data-split>
            Nine touchpoints, <em>one story</em>
          </h2>
          <p className={s.body} data-rise>
            Each M2O diamond comes with a brochure that tracks its creation, the complete story of a diamond made for one person.
          </p>
        </div>
        <div className={s.timelineWrap} data-timeline>
          <span className={s.timelineLine} data-line aria-hidden />
          <ol className={s.timeline}>
            {M2O_TOUCHPOINTS.map((t, i) => (
              <li key={t}>
                <span className={s.timelineDot} aria-hidden>
                  {i + 1}
                </span>
                <span className={s.timelineLabel}>{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className={s.storyGrid}>
          <div className={s.storyVisual} data-reveal-img>
            <Image src="/media/m2o/m2o-ring.webp" alt="A round brilliant diamond set in a solitaire ring" fill sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>
          <div className={s.storyText}>
            <h3 className={s.h3} data-rise>
              What the brochure records
            </h3>
            <ul className={s.recordList}>
              {M2O_BROCHURE.map((r) => (
                <li key={r} data-rise>
                  {r}
                </li>
              ))}
            </ul>
            <a href={M2O_SAMPLE_BROCHURE} className={s.storyLink} target="_blank" rel="noreferrer" data-rise>
              See a sample brochure <External />
              <span className={s.srOnly}> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function M2OIdeas() {
  const ref = useRef<HTMLElement>(null);
  useM2OMotion(ref);
  return (
    <section ref={ref} className={s.ideas} aria-labelledby="m2o-ideas">
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow} data-rise>
            For your clients
          </p>
          <h2 id="m2o-ideas" className={s.h2} data-split>
            Grown to <em>mean something</em>
          </h2>
          <p className={s.body} data-rise>
            Commemorate a birthday, an anniversary or any special date with a diamond grown to a specific size or shape, and give your client a part in its creation.
          </p>
        </div>
        <ul className={s.ideaRow}>
          {M2O_IDEAS.map((idea) => (
            <li key={idea.size} className={s.idea} data-rise>
              <span className={s.ideaSize}>{idea.size}</span>
              <span>{idea.line}</span>
            </li>
          ))}
          <li className={s.idea} data-rise>
            <span className={s.ideaKicker}>Diamond Legacy</span>
            <span>Every diamond in a Legacy collection is grown from the same seed line, for each milestone to come.</span>
            <Link href="/legacy" className={s.ideaGo}>
              Explore Legacy <Arrow />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
