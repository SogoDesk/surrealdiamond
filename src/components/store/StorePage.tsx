"use client";

/**
 * The store listing, on Tanishq's listing pattern in the Surreal design
 * system (docs/CONTEXT.md, "UX reference"). Both /jewelry and
 * /jewelry/[category] render it. Top to bottom: breadcrumb, title with the
 * piece count and the dealer pricing note, one compact row of division pills
 * (Collections and Programs open as panels), the toolbar (Filters, Metal,
 * Shape, Sort, density), the
 * active filter chips, then the grid: four to six cards a row on desktop,
 * with the "find your match" panel after the second row, a Made to Order
 * tile after the fourth, campaign photographs through the rows, and Load
 * more at the foot. The Surreal Assurance and the footer close the page.
 *
 * The admin console (lib/merch.ts) sets each page's default sort and the
 * pieces featured to its top (BRD R-33, R-34); the pins hold in the page's
 * default order, and a customer's own sort re-sorts everything.
 *
 * Filters and the sort live in the query string (shared with the older shop
 * helpers in components/shop/filters.ts). Reading it goes through
 * useSearchParams inside a Suspense boundary whose fallback is the same view
 * with no query, so the server sends the full list.
 */

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SiteChrome from "@/components/chrome/SiteChrome";
import ContactDrawer from "@/components/chrome/ContactDrawer";
import Footer from "@/components/sections/Footer";
import Assurance from "@/components/brand/Assurance";
import DivisionMotif from "@/components/brand/DivisionMotif";
import { categoryFor, clearedQuery, matchesQuery, parseQuery, poolFor, serializeQuery, showsShapes, sortProducts, type ShopQuery } from "@/components/shop/filters";
import { renderSrc, type Category } from "@/content/catalog";
import { applyPins, pageSort, useMerch } from "@/lib/merch";
import { useWithMetalsList } from "@/lib/metals";
import { divisionGroups, divisions, type Division, type DivisionGroup } from "@/content/divisions";
import { account } from "@/content/site";
import { useDealer } from "@/lib/dealer";
import StoreToolbar, { type Density } from "./StoreToolbar";
import StoreGrid from "./StoreGrid";
import FilterDrawer from "./FilterDrawer";
import s from "./store.module.css";

export interface StorePageProps {
  category: Category | null;
}

export default function StorePage({ category }: StorePageProps) {
  return (
    <>
      <SiteChrome />
      <ContactDrawer />
      <main id="main">
        <Suspense fallback={<StoreView category={category} params={null} />}>
          <WithParams category={category} />
        </Suspense>
        <Assurance />
        <Footer />
      </main>
    </>
  );
}

function WithParams({ category }: StorePageProps) {
  const params = useSearchParams();
  return <StoreView category={category} params={params} />;
}

const shortLabel = (label: string) => label.replace(" Collection", "");

function DivisionThumb({ division }: { division: Division }) {
  return division.image ? (
    <Image src={renderSrc(division.image)} alt="" width={96} height={96} sizes="40px" />
  ) : division.motif ? (
    <DivisionMotif motif={division.motif} className={s.pillMotif} />
  ) : null;
}

/**
 * The divisions as one compact row, so the pieces start high on the first
 * screen (client feedback, November 2026): All and the jewelry categories as
 * pills with a small thumbnail, then Collections and Programs as two pills
 * that open a panel of their tiles. Laptops wrap the row; tablets and phones
 * scroll it sideways. On a collection or program page its pill shows the
 * page's name.
 */
function DivisionPills({ active }: { active: Category | null }) {
  const [open, setOpen] = useState<DivisionGroup | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menus = divisionGroups.filter((g) => g.id !== "types");

  return (
    <nav ref={ref} className={s.pills} aria-label="Jewelry divisions">
      <ul className={s.pillRow}>
        <li>
          <Link href="/jewelry" className={`${s.pill} ${s.pillText}`} aria-current={active === null ? "page" : undefined}>
            All jewelry
          </Link>
        </li>
        {divisions
          .filter((d) => d.group === "types")
          .map((d) => (
            <li key={d.id}>
              <Link href={d.href} className={s.pill} aria-current={active === d.id ? "page" : undefined}>
                <span className={s.pillThumb} aria-hidden>
                  <DivisionThumb division={d} />
                </span>
                {d.label}
              </Link>
            </li>
          ))}
        {menus.map((g) => {
          const current = divisions.find((d) => d.group === g.id && d.id === active);
          return (
            <li key={g.id}>
              <button
                type="button"
                className={`${s.pill} ${s.pillMenu}`}
                aria-expanded={open === g.id}
                aria-controls={`divisions-${g.id}`}
                data-on={current ? "true" : undefined}
                onClick={() => setOpen((o) => (o === g.id ? null : g.id))}
              >
                {current ? shortLabel(current.label) : g.label}
                <svg aria-hidden viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={s.pillChevron}>
                  <path d="m3 4.5 3 3 3-3" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {menus.map((g) => (
        <div key={g.id} id={`divisions-${g.id}`} className={s.pillPanel} hidden={open !== g.id}>
          <p className={s.pillPanelTitle}>{g.label}</p>
          <ul className={s.pillPanelList}>
            {divisions
              .filter((d) => d.group === g.id)
              .map((d) => (
                <li key={d.id}>
                  <Link href={d.href} className={s.tile} aria-current={active === d.id ? "page" : undefined} onClick={() => setOpen(null)}>
                    <span className={s.tileThumb} aria-hidden>
                      <DivisionThumb division={d} />
                    </span>
                    <span className={s.tileLabel}>{shortLabel(d.label)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function StoreView({ category, params }: StorePageProps & { params: URLSearchParams | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const merch = useMerch();
  const dealer = useDealer();
  const page = category ?? "all";
  const defaultSort = pageSort(merch, page);
  const pinned = merch.pins[page];
  const query = useMemo(() => {
    const q = parseQuery(params);
    return params?.get("sort") ? q : { ...q, sort: defaultSort };
  }, [params, defaultSort]);
  const shapesOn = showsShapes(category);
  const meta = categoryFor(category);

  const source = useMemo(() => poolFor(category), [category]);
  const configured = useWithMetalsList(source);
  const pool = useMemo(() => {
    const sorted = sortProducts(configured, query.sort);
    return query.sort === defaultSort ? applyPins(sorted, pinned) : sorted;
  }, [configured, query.sort, defaultSort, pinned]);
  const matches = useMemo(() => pool.filter((p) => matchesQuery(p, query, shapesOn)), [pool, query, shapesOn]);

  const [density, setDensity] = useState<Density>(5);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setQuery = useCallback(
    (next: ShopQuery) => {
      // The page's default sort stays out of the URL; any other choice, "featured" included, is written out.
      const params = new URLSearchParams(serializeQuery({ ...next, sort: "featured" }));
      if (next.sort !== defaultSort) params.set("sort", next.sort);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, defaultSort],
  );
  const clearFilters = useCallback(() => setQuery(clearedQuery(query)), [query, setQuery]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const title = meta?.label ?? "All jewelry";

  return (
    <>
      <section className={s.head} aria-labelledby="store-title">
        <div className={s.wrap}>
          <nav aria-label="Breadcrumb" className={s.crumbs}>
            <Link href="/">Home</Link>
            <span aria-hidden>/</span>
            {meta ? (
              <>
                <Link href="/jewelry">Jewelry</Link>
                <span aria-hidden>/</span>
                <span aria-current="page">{meta.label}</span>
              </>
            ) : (
              <span aria-current="page">Jewelry</span>
            )}
          </nav>
          <div className={s.titleRow}>
            <div className={s.titleText}>
              <h1 id="store-title" className={s.title}>
                {title} <span className={s.titleCount}>({pool.length} pieces)</span>
              </h1>
              <p className={s.blurb}>{meta?.blurb ?? "Every piece in the catalog, set with lab grown diamonds we grow ourselves."}</p>
            </div>
            {/* Visitors only: a signed-in dealer already has prices, so no second Log in or Become a dealer (client feedback, 28 October 2026). */}
            {!dealer && (
              <div className={s.dealerNote}>
                <span className={s.dealerNoteText}>
                  <strong>Pricing</strong> and ordering open once you log in.
                </span>
                <span className={s.dealerNoteDoors}>
                  <Link href={account.login} className={s.dealerLogin}>
                    <span className={s.loginLong}>Log in</span>
                    <span className={s.loginShort}>Log in for pricing</span>
                  </Link>
                  <Link href={account.apply} className={s.dealerApply}>
                    Become a dealer
                  </Link>
                </span>
              </div>
            )}
          </div>
          <DivisionPills active={category} />
        </div>
      </section>

      <section className={s.body} aria-label={`${title}, pieces`}>
        <StoreToolbar
          query={query}
          showShapes={shapesOn}
          density={density}
          count={matches.length}
          onQueryChange={setQuery}
          onDensityChange={setDensity}
          onOpenFilters={() => setDrawerOpen(true)}
          onClear={clearFilters}
        />
        <StoreGrid key={serializeQuery(query)} category={category} matches={matches} density={density} query={query} showShapes={shapesOn} onQueryChange={setQuery} onClear={clearFilters} />
      </section>

      <FilterDrawer open={drawerOpen} category={category} query={query} showShapes={shapesOn} onApply={setQuery} onClose={closeDrawer} />
    </>
  );
}
