"use client";

/**
 * The SPIF program (client task list, November 2026, item 21; from Surreal's
 * "Sales Incentive Program" dashboard page). Surreal pays store associates
 * incentives on a Jewelry Rewards cash debit card; registration and the sales
 * submissions live on the Jewelry Rewards site, so this page explains the
 * program and links out to it:
 *
 * 1. The welcome with the two doors (register the first time, log in) beside
 *    an illustration of the card.
 * 2. How it works, in five steps.
 * 3. Good to know: when incentives are paid, who takes part, the tax ID, and
 *    Surreal's number for questions.
 *
 * Left out from the old page: the note that cards would be funded for past
 * transactions once the banking setup was finished (from the program's
 * launch, no longer current).
 */

import Link from "next/link";
import { useRef } from "react";
import LineMark from "@/components/brand/LineMark";
import Wordmark from "@/components/brand/Wordmark";
import { LOGO_IVORY } from "@/components/brand/Logo";
import { useM2OMotion } from "@/components/diamonds/useM2OMotion";
import { SPIF } from "@/content/programs";
import { brand } from "@/content/site";
import ExtIcon from "./ExtIcon";
import p from "./pages.module.css";
import x from "./programs.module.css";

export default function SpifProgram() {
  const ref = useRef<HTMLDivElement>(null);
  useM2OMotion(ref);

  return (
    <div ref={ref} className={`${p.page} ${x.programPage}`}>
      <nav aria-label="Breadcrumb" className={p.crumbs}>
        <Link href="/dashboard">Dashboard</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">SPIF program</span>
      </nav>

      <section className={x.spifHero} aria-labelledby="spif-title">
        <div>
          <p className={p.kicker}>SPIF program</p>
          <h1 id="spif-title" className={p.title}>
            A thank you for <em>every Surreal sale</em>
          </h1>
          <p className={p.lead}>
            The Surreal Diamond Sales Incentive Program pays your store associates for their Surreal sales, on a {SPIF.partner} cash debit card. Associates register, store managers approve them, and each month the spiffs for qualifying sales are loaded
            onto the card.
          </p>
          <div className={x.spifDoors}>
            <div className={x.spifDoor}>
              <p className={x.doorLabel}>New to the program and to {SPIF.partner}? Register once, then your manager approves you.</p>
              <a href={SPIF.register} target="_blank" rel="noreferrer" className={`${p.primary} ${x.withIcon}`}>
                Register <ExtIcon />
              </a>
            </div>
            <div className={x.spifDoor}>
              <p className={x.doorLabel}>Already in the program? Log in to add and manage your sales submissions.</p>
              <a href={SPIF.login} target="_blank" rel="noreferrer" className={`${p.secondary} ${x.withIcon} ${x.tallSecondary}`}>
                Log in <ExtIcon />
              </a>
            </div>
          </div>
          <p className={x.doorNote}>Both open {SPIF.partner} in a new tab.</p>
        </div>

        <div className={x.cardStage} aria-hidden>
          <div className={x.cardFloat}>
            <div className={x.rewardCard} data-palette="brand">
              <span className={x.cardSheen} />
              <span className={x.cardBrand}>
                <LineMark className={x.cardMark} navy={LOGO_IVORY} />
                <Wordmark size={24} withByline withTm />
              </span>
              <span className={x.cardChip} />
              <span className={x.cardFoot}>
                <span className={x.cardName}>Your name</span>
                <span className={x.cardPartner}>{SPIF.partner}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={x.section} aria-labelledby="spif-how">
        <div className={x.sectionHead} data-rise>
          <div>
            <h2 id="spif-how" className={x.sectionTitle}>
              How it works
            </h2>
            <p className={x.sectionLine}>From registration to the monthly load on your card.</p>
          </div>
        </div>
        <div className={x.stepsWrap} data-timeline>
          <span className={x.stepsLine} data-line aria-hidden />
          <ol className={x.steps}>
            {SPIF.steps.map((s, i) => (
              <li key={s.title}>
                <span className={x.stepNum} aria-hidden>
                  {i + 1}
                </span>
                <strong>{s.title}</strong>
                <span>{s.line}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={x.section} aria-labelledby="spif-facts">
        <div className={x.sectionHead} data-rise>
          <h2 id="spif-facts" className={x.sectionTitle}>
            Good to know
          </h2>
        </div>
        <dl className={x.facts}>
          {SPIF.facts.map((f) => (
            <div key={f.title} data-rise>
              <dt>{f.title}</dt>
              <dd>{f.line}</dd>
            </div>
          ))}
          <div data-rise>
            <dt>Questions</dt>
            <dd>
              Call us on <a href={brand.office.phoneHref}>{brand.office.phone}</a>, {brand.office.hours}.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
