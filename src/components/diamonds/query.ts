/**
 * Diamond page filters and sort (BRD R-16, R-17; client feedback F-B1, F-B2;
 * client change request, November 2026). Pure functions over the stone
 * feed. Ranges are inclusive; color and clarity are ranges over their grade
 * scales (best first); measurements are length, width and depth ranges in
 * millimetres (placeholder layout until Surreal's reference, C-16); table
 * and depth are percentage ranges. The source filter and the next day sort
 * and filter are gone (the November request reversed the delivery
 * highlighting). feedOptions reads every filter's choices and ranges from
 * the feed itself. The M2O link carries the search into the Made to Order
 * request (R-19), and fromParams reads a search handed over in the address
 * (the site search, the homepage).
 */

import { CLARITIES, COLORS, FLUORESCENCE, GRADES, LABS, SEARCH_SHAPES, SHAPES, SHAPE_LABEL, type Fluorescence, type Grade, type Lab, type Stone, type StoneShape } from "@/content/diamonds";
import { stonePrice } from "@/lib/pricing";

export type SortKey = "carat-asc" | "carat-desc" | "price-asc" | "price-desc";

export const SORT_LABEL: Record<SortKey, string> = {
  "carat-asc": "Carat, low to high",
  "carat-desc": "Carat, high to low",
  "price-asc": "Price, low to high",
  "price-desc": "Price, high to low",
};
/** Price sorts need a price, so they are offered to signed-in dealers only. */
export const PRICE_SORTS: SortKey[] = ["price-asc", "price-desc"];

export interface DiamondQuery {
  shapes: StoneShape[];
  caratMin: number | null;
  caratMax: number | null;
  /** Indexes into COLORS, inclusive; null for any. */
  color: [number, number] | null;
  clarity: [number, number] | null;
  cut: Grade[];
  lab: Lab[];
  /** Measurements in millimetres. */
  lengthMin: number | null;
  lengthMax: number | null;
  widthMin: number | null;
  widthMax: number | null;
  depthMin: number | null;
  depthMax: number | null;
  /** Table and depth as a percentage (depth here is the proportion, not the mm measurement above). */
  tableMin: number | null;
  tableMax: number | null;
  depthPctMin: number | null;
  depthPctMax: number | null;
  polish: Grade | null;
  symmetry: Grade | null;
  fluorescence: Fluorescence[];
  ratioMin: number | null;
  ratioMax: number | null;
  /** Diamond Legacy stones only (Start a Legacy opens the search with it). */
  legacy: boolean;
  sort: SortKey;
}

export const EMPTY: DiamondQuery = {
  shapes: [],
  caratMin: null,
  caratMax: null,
  color: null,
  clarity: null,
  cut: [],
  lab: [],
  lengthMin: null,
  lengthMax: null,
  widthMin: null,
  widthMax: null,
  depthMin: null,
  depthMax: null,
  tableMin: null,
  tableMax: null,
  depthPctMin: null,
  depthPctMax: null,
  polish: null,
  symmetry: null,
  fluorescence: [],
  ratioMin: null,
  ratioMax: null,
  legacy: false,
  sort: "carat-asc",
};

/**
 * What the search opens on (client feedback, November 2026): F color and
 * above, VS2 clarity and above. Clear all still goes to EMPTY, so every
 * stone can be listed.
 */
export const DEFAULT_QUERY: DiamondQuery = {
  ...EMPTY,
  color: [0, COLORS.indexOf("F")],
  clarity: [0, CLARITIES.indexOf("VS2")],
};

const gradeAtLeast = (g: Grade, min: Grade | null) => min === null || GRADES.indexOf(g) <= GRADES.indexOf(min);
const inRange = (n: number, lo: number | null, hi: number | null) => (lo === null || n >= lo) && (hi === null || n <= hi);

export function matches(s: Stone, q: DiamondQuery): boolean {
  if (q.shapes.length && !q.shapes.includes(s.shape)) return false;
  if (!inRange(s.carat, q.caratMin, q.caratMax)) return false;
  if (q.color && !inRange(COLORS.indexOf(s.color), q.color[0], q.color[1])) return false;
  if (q.clarity && !inRange(CLARITIES.indexOf(s.clarity), q.clarity[0], q.clarity[1])) return false;
  if (q.cut.length && (!s.cut || !q.cut.includes(s.cut))) return false;
  if (q.lab.length && !q.lab.includes(s.lab)) return false;
  if (!inRange(s.length, q.lengthMin, q.lengthMax) || !inRange(s.width, q.widthMin, q.widthMax) || !inRange(s.depth, q.depthMin, q.depthMax)) return false;
  if (!inRange(s.tablePct, q.tableMin, q.tableMax) || !inRange(s.depthPct, q.depthPctMin, q.depthPctMax)) return false;
  if (!gradeAtLeast(s.polish, q.polish) || !gradeAtLeast(s.symmetry, q.symmetry)) return false;
  if (q.fluorescence.length && !q.fluorescence.includes(s.fluorescence)) return false;
  if (!inRange(s.ratio, q.ratioMin, q.ratioMax)) return false;
  if (q.legacy && !s.legacy) return false;
  return true;
}

export function sortStones(list: Stone[], sort: SortKey): Stone[] {
  const out = [...list];
  const by = {
    "carat-asc": (a: Stone, b: Stone) => a.carat - b.carat,
    "carat-desc": (a: Stone, b: Stone) => b.carat - a.carat,
    "price-asc": (a: Stone, b: Stone) => stonePrice(a) - stonePrice(b),
    "price-desc": (a: Stone, b: Stone) => stonePrice(b) - stonePrice(a),
  }[sort];
  return out.sort(by);
}

export const hasMeasurements = (q: DiamondQuery) => [q.lengthMin, q.lengthMax, q.widthMin, q.widthMax, q.depthMin, q.depthMax].some((v) => v !== null);

/** How many filters are on, for the Clear button and the More filters badge. */
export function activeCount(q: DiamondQuery): { quick: number; more: number } {
  const quick = [q.shapes.length > 0, q.caratMin !== null || q.caratMax !== null, q.color !== null, q.clarity !== null, q.cut.length > 0, hasMeasurements(q), q.legacy].filter(Boolean).length;
  const more = [
    q.lab.length > 0,
    q.polish !== null,
    q.symmetry !== null,
    q.fluorescence.length > 0,
    q.ratioMin !== null || q.ratioMax !== null,
    q.tableMin !== null || q.tableMax !== null,
    q.depthPctMin !== null || q.depthPctMax !== null,
  ].filter(Boolean).length;
  return { quick, more };
}

type Span = [number, number] | null;
const spanOf = (list: Stone[], pick: (s: Stone) => number): Span => (list.length ? [Math.min(...list.map(pick)), Math.max(...list.map(pick))] : null);

/**
 * The filters' choices, read from the inventory feed rather than fixed
 * lists (client change request, November 2026): only the shapes, grades,
 * cuts and labs the feed carries, in their usual order, and the feed's span
 * for every range. Fluorescence offers None only. Color and clarity give
 * the indexes on their scales, so a range still reads as before.
 */
export function feedOptions(list: Stone[]) {
  const present = <T>(scale: readonly T[], pick: (s: Stone) => T | null) => scale.filter((x) => list.some((s) => pick(s) === x));
  const indexes = (scale: readonly string[], pick: (s: Stone) => string) => scale.map((_, i) => i).filter((i) => list.some((s) => pick(s) === scale[i]));
  return {
    shapes: present(SEARCH_SHAPES, (s) => s.shape),
    colors: indexes(COLORS, (s) => s.color),
    clarities: indexes(CLARITIES, (s) => s.clarity),
    cuts: present(GRADES, (s) => s.cut),
    polish: present(GRADES, (s) => s.polish),
    symmetry: present(GRADES, (s) => s.symmetry),
    labs: present(LABS, (s) => s.lab),
    fluorescence: present(FLUORESCENCE, (s) => s.fluorescence).filter((f): f is Fluorescence => f === "None"),
    carat: spanOf(list, (s) => s.carat),
    length: spanOf(list, (s) => s.length),
    width: spanOf(list, (s) => s.width),
    depth: spanOf(list, (s) => s.depth),
    ratio: spanOf(list, (s) => s.ratio),
    table: spanOf(list, (s) => s.tablePct),
    depthPct: spanOf(list, (s) => s.depthPct),
  };
}
export type FeedOptions = ReturnType<typeof feedOptions>;

/** "1.50" for one value, "1.50-2.00" for a range, null when neither end is set. */
function span(lo: number | null, hi: number | null, digits: number): string | null {
  if (lo === null && hi === null) return null;
  if (lo !== null && hi !== null && lo !== hi) return `${lo.toFixed(digits)}-${hi.toFixed(digits)}`;
  return (lo ?? hi ?? 0).toFixed(digits);
}

/** Of several grades picked, the lowest on the scale: what a made stone has to reach. */
function lowest<T extends string>(scale: readonly T[], picked: readonly T[]): T | null {
  return picked.length ? picked.reduce((a, b) => (scale.indexOf(b) > scale.indexOf(a) ? b : a)) : null;
}

/**
 * Made to Order link carrying the search (R-19; client request, November
 * 2026): the shape, the carat (the lower end of a range, with the upper end
 * for reference), color and clarity ranges, the lowest cut, polish,
 * symmetry and fluorescence picked, measurements, table and depth and the
 * ratio. From a stone, that stone's own figures. The M2O page reads them
 * into its form, where each can be changed. The lab is left out: every M2O
 * diamond comes with an IGI certificate.
 */
export function m2oHref(q: DiamondQuery, stone?: Stone): string {
  const p = new URLSearchParams();
  const shape = stone?.shape ?? q.shapes[0];
  if (shape) p.set("shape", shape);
  if (stone) {
    p.set("size", stone.carat.toFixed(2));
    p.set("color", stone.color);
    p.set("clarity", stone.clarity);
    if (stone.cut) p.set("cut", stone.cut);
    p.set("polish", stone.polish);
    p.set("symmetry", stone.symmetry);
    p.set("fluor", stone.fluorescence);
    p.set("dims", `${stone.length.toFixed(2)} x ${stone.width.toFixed(2)} x ${stone.depth.toFixed(2)}`);
    p.set("table", String(stone.tablePct));
    p.set("depthpct", String(stone.depthPct));
    if (stone.shape !== "round") p.set("ratio", stone.ratio.toFixed(2));
    p.set("from", stone.id);
  } else {
    if (q.caratMin !== null) p.set("size", q.caratMin.toFixed(2));
    if (q.caratMax !== null && q.caratMax !== q.caratMin) p.set("cmax", q.caratMax.toFixed(2));
    if (q.color) p.set("color", q.color[0] === q.color[1] ? COLORS[q.color[0]] : `${COLORS[q.color[0]]}-${COLORS[q.color[1]]}`);
    if (q.clarity) p.set("clarity", q.clarity[0] === q.clarity[1] ? CLARITIES[q.clarity[0]] : `${CLARITIES[q.clarity[0]]}-${CLARITIES[q.clarity[1]]}`);
    const cut = lowest(GRADES, q.cut);
    if (cut) p.set("cut", cut);
    if (q.polish) p.set("polish", q.polish);
    if (q.symmetry) p.set("symmetry", q.symmetry);
    const fluor = lowest(FLUORESCENCE, q.fluorescence);
    if (fluor) p.set("fluor", fluor);
    const dims = (
      [
        ["L", q.lengthMin, q.lengthMax],
        ["W", q.widthMin, q.widthMax],
        ["D", q.depthMin, q.depthMax],
      ] as const
    )
      .map(([k, lo, hi]) => {
        const v = span(lo, hi, 2);
        return v ? `${k} ${v.replace("-", " to ")}` : null;
      })
      .filter(Boolean)
      .join(", ");
    if (dims) p.set("dims", dims);
    const table = span(q.tableMin, q.tableMax, 1);
    if (table) p.set("table", table);
    const depthPct = span(q.depthPctMin, q.depthPctMax, 1);
    if (depthPct) p.set("depthpct", depthPct);
    const ratio = span(q.ratioMin, q.ratioMax, 2);
    if (ratio && shape !== "round") p.set("ratio", ratio);
  }
  const qs = p.toString();
  return `/diamonds/made-to-order${qs ? `?${qs}` : ""}`;
}

export const describe = (q: DiamondQuery) =>
  [q.shapes.map((s) => SHAPE_LABEL[s]).join(", "), q.caratMin !== null ? `${q.caratMin} ct and up` : "", q.color ? `${COLORS[q.color[0]]} to ${COLORS[q.color[1]]}` : ""].filter(Boolean).join(" · ");

/* The search in the address */

const num = (v: string | null) => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
function scaleRange(scale: readonly string[], v: string | null): [number, number] | null {
  if (!v) return null;
  const [a, b = a] = v.toUpperCase().split("-");
  const i = scale.indexOf(a);
  const j = scale.indexOf(b);
  return i < 0 || j < 0 ? null : [Math.min(i, j), Math.max(i, j)];
}

/**
 * Filters from the address: shape (one or more, comma separated), cmin and
 * cmax (carat), color and clarity (a grade or a range, D-F, VVS1-VS1), lab,
 * legacy=1 (the Legacy stones). Unknown values are ignored; null when the
 * address has none.
 */
export function fromParams(params: URLSearchParams | null): Partial<DiamondQuery> | null {
  if (!params) return null;
  const out: Partial<DiamondQuery> = {};
  const shapes = (params.get("shape") ?? "").split(",").filter((x): x is StoneShape => (SHAPES as readonly string[]).includes(x));
  if (shapes.length) out.shapes = shapes;
  const cmin = num(params.get("cmin"));
  const cmax = num(params.get("cmax"));
  if (cmin !== null) out.caratMin = cmin;
  if (cmax !== null) out.caratMax = cmax;
  const color = scaleRange(COLORS, params.get("color"));
  if (color) out.color = color;
  const clarity = scaleRange(CLARITIES, params.get("clarity"));
  if (clarity) out.clarity = clarity;
  const lab = (params.get("lab") ?? "").toUpperCase().split(",").filter((x): x is Lab => (LABS as readonly string[]).includes(x));
  if (lab.length) out.lab = lab;
  if (params.get("legacy") === "1") out.legacy = true;
  return Object.keys(out).length ? out : null;
}

/** The address for a search, the reverse of fromParams. */
export function toParams(q: Partial<DiamondQuery>): string {
  const p = new URLSearchParams();
  if (q.shapes?.length) p.set("shape", q.shapes.join(","));
  if (q.caratMin != null) p.set("cmin", String(q.caratMin));
  if (q.caratMax != null) p.set("cmax", String(q.caratMax));
  if (q.color) p.set("color", q.color[0] === q.color[1] ? COLORS[q.color[0]] : `${COLORS[q.color[0]]}-${COLORS[q.color[1]]}`);
  if (q.clarity) p.set("clarity", q.clarity[0] === q.clarity[1] ? CLARITIES[q.clarity[0]] : `${CLARITIES[q.clarity[0]]}-${CLARITIES[q.clarity[1]]}`);
  if (q.lab?.length) p.set("lab", q.lab.join(","));
  if (q.legacy) p.set("legacy", "1");
  return p.toString();
}
