"use client";

/**
 * The Made to Order page around the request form, from Surreal's own M2O page
 * (content, photographs and the cost table, at Surreal's request, November
 * 2026): the hero with the M2O mark, the program terms, the M2O costs (signed
 * in dealers only, from the API), the nine touchpoints and the brochure, and
 * sizes that mean something.
 */

import Image from "next/image";
import Link from "next/link";
import { account } from "@/content/site";
import { M2O_BROCHURE, M2O_IDEAS, M2O_SAMPLE_BROCHURE, M2O_TERMS, M2O_TOUCHPOINTS } from "@/content/m2o";
import { SHAPE_LABEL, type StoneShape } from "@/content/diamonds";
import { bandFor, caratRange, formatCarat, formatCents, type M2OPricingState } from "@/lib/m2oPricing";
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
              <a href={M2O_SAMPLE_BROCHURE} className={s.secondary} target="_blank" rel="noreferrer">
                Sample brochure <External />
                <span className={s.srOnly}> (opens in a new tab)</span>
              </a>
            </div>
          </div>
          <div className={s.heroVisual} data-palette="brand">
            <Image src="/media/m2o/m2o-tweezers.webp" alt="A round brilliant diamond held in tweezers beside a measuring scale" fill priority sizes="(min-width: 1024px) 44vw, 100vw" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function M2OTerms() {
  return (
    <section className={s.terms} aria-labelledby="m2o-how">
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow}>How it works</p>
          <h2 id="m2o-how" className={s.h2}>
            Any diamond, <em>grown to order</em>
          </h2>
        </div>
        <ul className={s.termGrid}>
          {M2O_TERMS.map((t) => (
            <li key={t.title} className={s.term}>
              <svg aria-hidden viewBox="0 0 10 10" width="10" height="10" className={s.termMark}>
                <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="currentColor" />
              </svg>
              <strong>{t.title}</strong>
              <span>{t.line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const shapeList = (shapes: string[]) => {
  const names = shapes.map((sh) => (SHAPE_LABEL[sh as StoneShape] ?? sh).toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
};

/** The cost table: for signed-in dealers, from the API; a log in prompt for everyone else. */
export function M2OCosts({ state }: { state: M2OPricingState }) {
  const ready = state.status === "ready" ? state.pricing : null;
  const example = ready ? bandFor(ready, 2) : null;
  return (
    <section id="costs" className={s.costs} aria-labelledby="m2o-costs">
      <div className={s.wrap}>
        <div className={s.costsGrid}>
          <div className={s.costsText}>
            <p className={s.eyebrow}>M2O costs</p>
            <h2 id="m2o-costs" className={s.h2}>
              Priced <em>by the carat</em>
            </h2>
            {ready ? (
              <p className={s.body}>
                Every M2O diamond carries an M2O fee of {formatCents(ready.feeCents, { whole: true })}, plus the cost of the diamond at the price per carat for its size. The
                table covers all standard shapes: {shapeList(ready.standardShapes)}. Surreal confirms the price after your request.
              </p>
            ) : (
              <p className={s.body}>Every M2O diamond carries an M2O fee, plus the cost of the diamond at a price per carat for its size. Surreal confirms the price after your request.</p>
            )}
            <div className={s.costsVisual} data-palette="brand">
              <Image src="/media/m2o/m2o-stone.webp" alt="A round brilliant diamond on black, measured to the hundredth" fill sizes="(min-width: 1024px) 24vw, 100vw" />
            </div>
          </div>

          <div className={s.costCard}>
            {ready ? (
              <>
                <table className={s.costTable}>
                  <caption className={s.srOnly}>M2O cost per carat by size, for all standard shapes, before the M2O fee</caption>
                  <thead>
                    <tr>
                      <th scope="col">Carat weight</th>
                      <th scope="col">Price per carat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ready.bands.map((b) => (
                      <tr key={b.fromCarat}>
                        <td>
                          {formatCarat(b.fromCarat)} to {formatCarat(b.toCarat)} ct
                        </td>
                        <td>{formatCents(b.perCaratCents, { whole: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={s.costFee}>
                  <span>M2O fee, per diamond</span>
                  <strong>{formatCents(ready.feeCents, { whole: true })}</strong>
                </p>
                {example && (
                  <p className={s.costNote}>
                    A 2.00 ct round: 2.00 × {formatCents(example.perCaratCents, { whole: true })} = {formatCents(2 * example.perCaratCents, { whole: true })}, plus the{" "}
                    {formatCents(ready.feeCents, { whole: true })} fee, comes to {formatCents(2 * example.perCaratCents + ready.feeCents, { whole: true })}.
                  </p>
                )}
                <p className={s.costNote}>
                  Other shapes, and sizes outside {formatCarat(caratRange(ready).from)} to {formatCarat(caratRange(ready).to)} ct, are quoted by Surreal.
                </p>
              </>
            ) : state.status === "loading" ? (
              <div className={s.costSkeleton} aria-busy="true" aria-label="Loading the M2O costs">
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            ) : state.status === "error" ? (
              <div className={s.costLocked} role="alert">
                <p className={s.costLockedTitle}>The M2O costs could not be loaded</p>
                <p>Check your connection and try again.</p>
                <button type="button" className={s.secondary} onClick={state.retry}>
                  Try again
                </button>
              </div>
            ) : state.status === "unavailable" ? (
              <div className={s.costLocked}>
                <p className={s.costLockedTitle}>Costs load from the live site</p>
                <p>This preview has no server to ask, so the M2O cost table shows once you are signed in on the live site.</p>
              </div>
            ) : (
              <div className={s.costLocked}>
                <span className={s.lock} aria-hidden>
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" />
                    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                  </svg>
                </span>
                <p className={s.costLockedTitle}>M2O costs are for Surreal dealers</p>
                <p>Log in to see the M2O fee and the price per carat for every size, with an estimate beside your request.</p>
                <div className={s.doors}>
                  <Link href={`${account.login}?next=${encodeURIComponent("/diamonds/made-to-order")}`} className={s.primary}>
                    Log in
                  </Link>
                  <Link href={account.apply} className={s.secondary}>
                    Become a dealer
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function M2OStory() {
  return (
    <section className={s.story} data-palette="brand" aria-labelledby="m2o-story">
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow}>Its story, in a brochure</p>
          <h2 id="m2o-story" className={s.h2}>
            Nine touchpoints, <em>one story</em>
          </h2>
          <p className={s.body}>Each M2O diamond comes with a brochure that tracks its creation, the complete story of a diamond made for one person.</p>
        </div>
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
        <div className={s.storyGrid}>
          <div className={s.storyVisual}>
            <Image src="/media/m2o/m2o-ring.webp" alt="A round brilliant diamond set in a solitaire ring" fill sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>
          <div className={s.storyText}>
            <h3 className={s.h3}>What the brochure records</h3>
            <ul className={s.recordList}>
              {M2O_BROCHURE.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <a href={M2O_SAMPLE_BROCHURE} className={s.storyLink} target="_blank" rel="noreferrer">
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
  return (
    <section className={s.ideas} aria-labelledby="m2o-ideas">
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow}>For your clients</p>
          <h2 id="m2o-ideas" className={s.h2}>
            Grown to <em>mean something</em>
          </h2>
          <p className={s.body}>
            Commemorate a birthday, an anniversary or any special date with a diamond grown to a specific size or shape, and give your client a part in its creation.
          </p>
        </div>
        <ul className={s.ideaGrid}>
          {M2O_IDEAS.map((idea) => (
            <li key={idea.size} className={s.idea}>
              <span className={s.ideaSize}>{idea.size}</span>
              <span>{idea.line}</span>
            </li>
          ))}
          <li>
            <Link href="/legacy" className={`${s.idea} ${s.ideaLink}`}>
              <span className={s.ideaKicker}>Diamond Legacy</span>
              <span>Every diamond in a Legacy collection is grown from the same seed line, for each milestone to come.</span>
              <span className={s.ideaGo}>
                Explore Legacy <Arrow />
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
