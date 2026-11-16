/**
 * Adding to the inventory from the console: one piece or stone through a
 * form, or many from an Excel workbook or CSV. Both paths read a row the
 * same way here, so a value accepted in the form is accepted in a file.
 *
 * Columns are matched by header name, including the stone feed's own
 * (interchange_shapecode, interchange_weight and so on, and its misspelled
 * interchage_video_link). Codes are read into the site's scales: shape codes
 * (RD round, OV oval, CC cushion, RC radiant, PR princess, EC emerald, PS
 * pear, HS heart, as read from the test feed of 9 November 2026 and still to
 * be confirmed by Surreal), grades (I Ideal, EX Excellent, VG Very Good),
 * fluorescence, a video cell of 0 or #N/A as no video. Each row comes out as
 * new, an update (a certificate or style number the site already lists), or
 * an error that is skipped, with notes for what was read loosely.
 *
 * Nothing is saved here: the forms and uploads check and show the result,
 * and the inventory backend (B2 pieces, B3 stones) stores it.
 */

import { categories, metals, products, styleRef, type Category, type Metal } from "@/content/catalog";
import { CLARITIES, COLORS, FLUORESCENCE, LABS, SHAPE_LABEL, stones, type Clarity, type Color, type Fluorescence, type Grade, type Lab, type StoneShape } from "@/content/diamonds";

export interface ImportField<F extends string> {
  id: F;
  label: string;
  hint: string;
  required?: boolean;
  /** Header names that mean this field, compared lower case with _ and . read as spaces. */
  synonyms: string[];
}

export type ColumnMap<F extends string> = Record<F, number>;

export interface CheckedLine<R> {
  /** The row's line in the file (the header is line 1). */
  line: number;
  row: R;
  status: "new" | "update" | "error";
  issues: string[];
  notes: string[];
}

/** One row read for a form: problems keyed by field, so each shows under its input. */
export interface ReadResult<F extends string, R> {
  row: R;
  issues: Partial<Record<F, string>>;
  notes: string[];
  known: boolean;
}

const cleanHeader = (h: string) => h.toLowerCase().replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();

/** Match each field to a column by header name; -1 when the file has no such column. Exact names first, then a header that contains one. */
export function matchColumns<F extends string>(fields: ImportField<F>[], headers: string[]): ColumnMap<F> {
  const taken = new Set<number>();
  const heads = headers.map(cleanHeader);
  const out = {} as ColumnMap<F>;
  for (const f of fields) {
    const at = heads.findIndex((h, i) => !taken.has(i) && f.synonyms.includes(h));
    out[f.id] = at;
    if (at >= 0) taken.add(at);
  }
  for (const f of fields) {
    if (out[f.id] >= 0) continue;
    const at = heads.findIndex((h, i) => !taken.has(i) && h.length > 2 && f.synonyms.some((syn) => syn.length > 3 && h.includes(syn)));
    out[f.id] = at;
    if (at >= 0) taken.add(at);
  }
  return out;
}

/** Turns keyed problems into a file row's result, with duplicates within the file. */
function toLine<F extends string, R>(line: number, read: ReadResult<F, R>, dupe: string | null, dupeIsError: boolean): CheckedLine<R> {
  const issues = Object.values(read.issues).filter(Boolean) as string[];
  const notes = [...read.notes];
  if (dupe) (dupeIsError ? issues : notes).push(dupe);
  return { line, row: read.row, status: issues.length ? "error" : read.known ? "update" : "new", issues, notes };
}

const number = (raw: string): number | null => {
  const v = raw.replace(/[$,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
};

/* Pieces */

export type PieceField = "style" | "name" | "category" | "metals" | "defaultMetal" | "detail" | "carats" | "price";

export interface PieceRow {
  style: string;
  name: string;
  category: Category | null;
  metals: Metal[];
  defaultMetal: Metal | null;
  detail: string;
  carats: number[];
  /** Dealer price in US dollars, when the file gives one; otherwise the price list sets it. */
  price: number | null;
}

export const PIECE_FIELDS: ImportField<PieceField>[] = [
  { id: "style", label: "Style number", required: true, hint: "One per piece, for example LE2004W442", synonyms: ["style", "style number", "style no", "style #", "style code", "sku", "item", "item number", "item no", "item code", "model", "stock number"] },
  { id: "name", label: "Name", required: true, hint: "As dealers see it", synonyms: ["name", "title", "product name", "item name", "description name", "product"] },
  { id: "category", label: "Category", required: true, hint: categories.map((c) => c.label).join(", "), synonyms: ["category", "type", "product type", "item type", "collection category", "department"] },
  { id: "metals", label: "Metals", hint: "White gold, yellow gold, or both; blank is both", synonyms: ["metals", "metal", "metal type", "metal options", "gold", "metal color"] },
  { id: "defaultMetal", label: "Opens in", hint: "The metal shown first; blank is the first metal", synonyms: ["default metal", "opens in", "default", "primary metal", "main metal"] },
  { id: "detail", label: "Short description", hint: "One line under the name", synonyms: ["detail", "short description", "description", "subtitle", "design"] },
  { id: "carats", label: "Carat options", hint: "For example 0.50, 1.00, 1.50", synonyms: ["carats", "carat options", "carat", "sizes", "carat weights", "center carat", "ctw", "total carat weight"] },
  { id: "price", label: "Dealer price", hint: "Optional, US dollars", synonyms: ["price", "dealer price", "wholesale", "wholesale price", "cost to dealer", "net price"] },
];

const knownStyles = () => new Set(products.map(styleRef).filter(Boolean) as string[]);

export function readCategory(raw: string): Category | null {
  const v = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!v) return null;
  const hit = categories.find((c) => c.id.replace(/[^a-z]/g, "") === v || c.label.toLowerCase().replace(/[^a-z]/g, "") === v);
  if (hit) return hit.id;
  const loose = categories.find((c) => v.includes(c.id.replace(/[^a-z]/g, "").replace(/s$/, "")) || v.includes(c.label.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "")));
  return loose?.id ?? null;
}

export function readMetals(raw: string): { metals: Metal[]; unknown: string[] } {
  const parts = raw
    .split(/[\/,;|&+]|\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: Metal[] = [];
  const unknown: string[] = [];
  for (const p of parts) {
    const v = p.toLowerCase().replace(/[^a-z]/g, "");
    const m: Metal | null = /^(wg|w|white|whitegold|kwg|kwhitegold)$/.test(v) ? "wg" : /^(yg|y|yellow|yellowgold|kyg|kyellowgold)$/.test(v) ? "yg" : null;
    if (m && !out.includes(m)) out.push(m);
    else if (!m) unknown.push(p);
  }
  return { metals: out, unknown };
}

const metalLabel = (m: Metal) => metals.find((x) => x.id === m)?.label ?? m;

/** One piece from raw text, for the form and for each file row. */
export function readPiece(get: (f: PieceField) => string, styles = knownStyles()): ReadResult<PieceField, PieceRow> {
  const issues: Partial<Record<PieceField, string>> = {};
  const notes: string[] = [];
  const style = get("style").toUpperCase().replace(/\s+/g, "");
  if (!style) issues.style = "Enter the style number";
  else if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(style)) issues.style = `"${get("style")}" is not a style number: letters and digits, 3 to 30`;

  const name = get("name").replace(/\s+/g, " ");
  if (name.length < 3) issues.name = name ? "Give the piece a longer name" : "Enter the name";

  const categoryRaw = get("category");
  const category = readCategory(categoryRaw);
  if (!category) issues.category = categoryRaw ? `"${categoryRaw}" is not one of the site's categories` : "Choose the category";

  const metalsRaw = get("metals");
  const read = readMetals(metalsRaw);
  let pieceMetals = read.metals;
  if (read.unknown.length) issues.metals = `${read.unknown.map((u) => `"${u}"`).join(", ")} is not white or yellow gold`;
  if (!metalsRaw.trim()) pieceMetals = ["wg", "yg"];
  else if (!pieceMetals.length && !issues.metals) issues.metals = "Choose at least one metal";

  const defaultRaw = get("defaultMetal");
  let defaultMetal: Metal | null = pieceMetals[0] ?? null;
  if (defaultRaw.trim()) {
    const d = readMetals(defaultRaw).metals[0];
    if (!d) issues.defaultMetal = `"${defaultRaw}" is not white or yellow gold`;
    else if (!pieceMetals.includes(d)) notes.push(`Opens in ${metalLabel(d)}, which is not one of its metals, so it opens in ${defaultMetal ? metalLabel(defaultMetal) : "its first metal"}`);
    else defaultMetal = d;
  }

  const caratParts = get("carats")
    .split(/[,;\/|]|\s+/)
    .map((c) => c.replace(/ct$/i, "").trim())
    .filter(Boolean);
  const carats = caratParts.map(Number);
  if (carats.some((c) => !Number.isFinite(c) || c <= 0 || c > 30)) issues.carats = `"${get("carats")}" should be carat weights, for example 0.50, 1.00`;

  const price = number(get("price"));
  if (price !== null && (Number.isNaN(price) || price < 0)) issues.price = `"${get("price")}" is not a price in dollars`;

  const detail = get("detail").replace(/\s+/g, " ");
  if (!detail && !issues.name) notes.push("No short description");

  return {
    row: { style, name, category, metals: pieceMetals, defaultMetal, detail, carats: [...new Set(carats.filter((c) => Number.isFinite(c) && c > 0))].sort((a, b) => a - b), price: price !== null && !Number.isNaN(price) ? price : null },
    issues,
    notes,
    known: Boolean(style) && styles.has(style),
  };
}

export function checkPieces(table: string[][], map: ColumnMap<PieceField>): CheckedLine<PieceRow>[] {
  const styles = knownStyles();
  const seen = new Map<string, number>();
  return table.slice(1).map((r, i) => {
    const line = i + 2;
    const read = readPiece((f) => (map[f] >= 0 ? (r[map[f]] ?? "").trim() : ""), styles);
    const first = read.row.style ? seen.get(read.row.style) : undefined;
    if (read.row.style && first === undefined) seen.set(read.row.style, line);
    return toLine(line, read, first !== undefined ? `Same style number as line ${first}` : null, true);
  });
}

export const PIECE_TEMPLATE: string[][] = [
  PIECE_FIELDS.map((f) => f.label),
  ["LE2004W442", "Oval Halo Engagement Ring", "Engagement Rings", "White gold / Yellow gold", "White gold", "Oval center, pave halo", "1.00, 1.50, 2.00", ""],
];

/* Stones */

export type StoneField =
  | "certificate"
  | "lab"
  | "stock"
  | "shape"
  | "carat"
  | "color"
  | "clarity"
  | "cut"
  | "polish"
  | "symmetry"
  | "fluorescence"
  | "depthPct"
  | "tablePct"
  | "length"
  | "width"
  | "depth"
  | "price"
  | "cost"
  | "video"
  | "legacy";

export interface StoneRow {
  certificate: string;
  lab: Lab | null;
  stock: string;
  shape: StoneShape | null;
  carat: number | null;
  color: Color | null;
  clarity: Clarity | null;
  cut: Grade | null;
  polish: Grade | null;
  symmetry: Grade | null;
  fluorescence: Fluorescence | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  tablePct: number | null;
  depthPct: number | null;
  /** Dealer price per carat, US dollars. */
  pricePerCarat: number | null;
  /** Staff only; never shown to dealers. */
  costPerCarat: number | null;
  video: string;
  legacy: boolean;
}

const feed = (name: string) => [`interchange ${name}`, `interchange_${name}`];

/** Percentages come before the millimetre measurements so "Depth %" is not taken for depth in mm. */
export const STONE_FIELDS: ImportField<StoneField>[] = [
  { id: "certificate", label: "Certificate number", required: true, hint: "The lab report number; one per stone", synonyms: ["certificate", "certificate no", "certificate number", "certificate #", "cert", "cert no", "cert number", "cert #", "report", "report no", "report number", "lab report", ...feed("certificate no")] },
  { id: "lab", label: "Lab", required: true, hint: LABS.join(" or "), synonyms: ["lab", "labcode", "lab code", "lab name", "certifier", "grading lab", "laboratory", ...feed("labcode")] },
  { id: "stock", label: "Stock ID", hint: "Surreal's own code, for example SBD10755", synonyms: ["stock", "stock id", "stock no", "stock number", "stock #", "code", "item code", "item", "sku", "lot", "lot number", ...feed("code")] },
  { id: "shape", label: "Shape", required: true, hint: "A name or a code such as RD, OV, CC", synonyms: ["shape", "shape code", "shapecode", "cut shape", ...feed("shapecode")] },
  { id: "carat", label: "Carat", required: true, hint: "Weight, for example 1.52", synonyms: ["carat", "carats", "carat weight", "weight", "ct", "cts", "size", ...feed("weight")] },
  { id: "color", label: "Color", required: true, hint: `${COLORS[0]} to ${COLORS[COLORS.length - 1]}`, synonyms: ["color", "colour", "color code", "colorcode", "color grade", ...feed("colorcode")] },
  { id: "clarity", label: "Clarity", required: true, hint: `${CLARITIES[0]} to ${CLARITIES[CLARITIES.length - 1]}`, synonyms: ["clarity", "clarity code", "claritycode", "clarity grade", ...feed("claritycode")] },
  { id: "cut", label: "Cut", hint: "Round stones: Ideal, Excellent (I, EX)", synonyms: ["cut", "cut grade", "cutgrade", "make", ...feed("cutgrade")] },
  { id: "polish", label: "Polish", hint: "EX, VG, G", synonyms: ["polish", "pol", ...feed("polish")] },
  { id: "symmetry", label: "Symmetry", hint: "EX, VG, G", synonyms: ["symmetry", "sym", "symm", ...feed("symmetry")] },
  { id: "fluorescence", label: "Fluorescence", hint: FLUORESCENCE.join(", "), synonyms: ["fluorescence", "fluor", "flour", "fluorescence intensity", "fl"] },
  { id: "depthPct", label: "Depth %", hint: "Total depth, percent", synonyms: ["depth %", "depth pct", "depth percent", "total depth", "td", "depth percentage", ...feed("depth pct")] },
  { id: "tablePct", label: "Table %", hint: "Percent", synonyms: ["table", "table %", "table pct", "table percent", "table percentage", ...feed("table pct")] },
  { id: "length", label: "Length (mm)", hint: "Millimetres", synonyms: ["length", "length mm", "len", "measurement length", "m1", ...feed("length")] },
  { id: "width", label: "Width (mm)", hint: "Millimetres", synonyms: ["width", "width mm", "wid", "measurement width", "m2", ...feed("width")] },
  { id: "depth", label: "Depth (mm)", hint: "Millimetres", synonyms: ["depth", "depth mm", "height", "measurement depth", "m3", ...feed("depth")] },
  { id: "price", label: "Price per carat", hint: "What dealers pay, US dollars per carat", synonyms: ["price per carat", "price/ct", "ppc", "$/ct", "price", "price1", "dealer price", "rate", ...feed("price1")] },
  { id: "cost", label: "Cost per carat", hint: "Staff only, never shown to dealers", synonyms: ["cost", "cost per carat", "cost/ct", "cost price", ...feed("cost")] },
  { id: "video", label: "Video link", hint: "An https link; 0 or #N/A means none", synonyms: ["video", "video link", "video url", "v360", "interchage video link", "interchage_video_link", ...feed("video link")] },
  { id: "legacy", label: "Diamond Legacy", hint: "Yes for Legacy stones", synonyms: ["legacy", "diamond legacy", "legacy program", "program"] },
];

const SHAPE_CODES: Record<string, StoneShape> = {
  RD: "round", RB: "round", BR: "round", RBC: "round",
  OV: "oval",
  PS: "pear", PE: "pear",
  EC: "emerald", EM: "emerald",
  PR: "princess", PC: "princess",
  RC: "radiant", RA: "radiant", RAD: "radiant",
  CC: "cushion", CU: "cushion", CUS: "cushion", CMB: "cushion",
  MQ: "marquise", MAR: "marquise",
  AS: "asscher", ASC: "asscher",
  HS: "heart", HT: "heart", HE: "heart",
};

export function readShape(raw: string): StoneShape | null {
  const v = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (!v) return null;
  if (SHAPE_CODES[v]) return SHAPE_CODES[v];
  const byName = (Object.keys(SHAPE_LABEL) as StoneShape[]).find((sh) => v.includes(sh.toUpperCase()));
  return byName ?? null;
}

const GRADE_CODES: Record<string, Grade> = { I: "Ideal", ID: "Ideal", IDEAL: "Ideal", EX: "Excellent", EXC: "Excellent", X: "Excellent", EXCELLENT: "Excellent", VG: "Very Good", VERYGOOD: "Very Good", G: "Good", GD: "Good", GOOD: "Good" };

/** A grade, null when blank, or the raw text when it is not on the site's scale. */
function readGrade(raw: string): Grade | null | { unknown: string } {
  const v = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (!v) return null;
  return GRADE_CODES[v] ?? { unknown: raw.trim() };
}

const FLUOR_CODES: Record<string, Fluorescence> = { N: "None", NO: "None", NON: "None", NONE: "None", NIL: "None", F: "Faint", FA: "Faint", FNT: "Faint", FAINT: "Faint", M: "Medium", MED: "Medium", MEDIUM: "Medium" };
const NO_VIDEO = /^(0|#?n\/?a|none|no|-+|nil|null)$/i;
const certKey = (c: string) => c.toUpperCase().replace(/[\s-]+/g, "").replace(/^LG/, "");
const knownCertificates = () => new Set(stones.map((st) => certKey(st.certificate)));

/** One stone from raw text, for the form and for each file row. */
export function readStone(get: (f: StoneField) => string, certificates = knownCertificates()): ReadResult<StoneField, StoneRow> {
  const issues: Partial<Record<StoneField, string>> = {};
  const notes: string[] = [];

  const certificate = get("certificate").toUpperCase().replace(/\s+/g, "");
  if (!certificate) issues.certificate = "Enter the certificate number";
  else if (!/^[A-Z0-9-]{5,24}$/.test(certificate)) issues.certificate = `"${get("certificate")}" is not a certificate number`;

  const labRaw = get("lab").toUpperCase().trim();
  const lab = (LABS as readonly string[]).includes(labRaw) ? (labRaw as Lab) : null;
  if (!lab) issues.lab = labRaw ? `Lab "${get("lab")}" is not one the site lists (${LABS.join(", ")})` : "Choose the lab";

  const shapeRaw = get("shape");
  const shape = readShape(shapeRaw);
  if (!shape) issues.shape = shapeRaw ? `Shape "${shapeRaw.trim()}" is not one the site knows` : "Choose the shape";

  const carat = number(get("carat"));
  if (carat === null) issues.carat = "Enter the carat weight";
  else if (Number.isNaN(carat) || carat <= 0 || carat > 100) issues.carat = `Carat "${get("carat")}" is not a weight`;

  const colorRaw = get("color").toUpperCase().trim();
  const color = (COLORS as readonly string[]).includes(colorRaw) ? (colorRaw as Color) : null;
  if (!color) issues.color = colorRaw ? `Color "${get("color").trim()}" is not on the site's ${COLORS[0]} to ${COLORS[COLORS.length - 1]} scale` : "Choose the color";

  const clarityRaw = get("clarity").toUpperCase().replace(/\s+/g, "");
  const clarity = (CLARITIES as readonly string[]).includes(clarityRaw) ? (clarityRaw as Clarity) : null;
  if (!clarity) issues.clarity = clarityRaw ? `Clarity "${get("clarity").trim()}" is not on the site's ${CLARITIES[0]} to ${CLARITIES[CLARITIES.length - 1]} scale` : "Choose the clarity";

  const grade = (f: "cut" | "polish" | "symmetry", label: string): Grade | null => {
    const g = readGrade(get(f));
    if (g && typeof g === "object") {
      notes.push(`${label} "${g.unknown}" is not on the site's scale, so it is left blank`);
      return null;
    }
    return g;
  };
  const cut = grade("cut", "Cut");
  const polish = grade("polish", "Polish");
  const symmetry = grade("symmetry", "Symmetry");

  const fluorRaw = get("fluorescence").toUpperCase().replace(/[^A-Z]/g, "");
  const fluorescence = fluorRaw ? (FLUOR_CODES[fluorRaw] ?? null) : null;
  if (fluorRaw && !fluorescence) notes.push(`Fluorescence "${get("fluorescence").trim()}" is not on the site's scale, so it is left blank`);

  const measure = (f: StoneField, label: string, lo: number, hi: number): number | null => {
    const n = number(get(f));
    if (n === null) return null;
    if (Number.isNaN(n)) {
      issues[f] = `${label} "${get(f)}" is not a number`;
      return null;
    }
    if (n <= 0) {
      issues[f] = `${label} should be more than 0`;
      return null;
    }
    if (n < lo || n > hi) notes.push(`${label} ${n} looks unusual`);
    return n;
  };
  const length = measure("length", "Length", 2, 40);
  const width = measure("width", "Width", 2, 40);
  const depth = measure("depth", "Depth", 1, 30);
  const tablePct = measure("tablePct", "Table %", 40, 85);
  const depthPct = measure("depthPct", "Depth %", 40, 85);

  const money = (f: "price" | "cost", label: string): number | null => {
    const n = number(get(f));
    if (n === null) return null;
    if (Number.isNaN(n) || n < 0) {
      issues[f] = `${label} "${get(f)}" is not an amount in dollars`;
      return null;
    }
    return Math.round(n * 100) / 100;
  };
  const pricePerCarat = money("price", "Price per carat");
  const costPerCarat = money("cost", "Cost per carat");

  const videoRaw = get("video").trim();
  let video = "";
  if (/^https:\/\/\S+$/i.test(videoRaw)) video = videoRaw;
  else if (/^http:\/\/\S+$/i.test(videoRaw)) {
    video = videoRaw;
    notes.push("The video link is not https");
  } else if (videoRaw && !NO_VIDEO.test(videoRaw)) notes.push(`Video "${videoRaw}" is not a link, so it is left out`);

  const legacy = /^(y|yes|true|1|x|legacy|diamond legacy)$/i.test(get("legacy").trim());

  return {
    row: {
      certificate,
      lab,
      stock: get("stock").toUpperCase().replace(/\s+/g, ""),
      shape,
      carat: carat !== null && !Number.isNaN(carat) ? carat : null,
      color,
      clarity,
      cut,
      polish,
      symmetry,
      fluorescence,
      length,
      width,
      depth,
      tablePct,
      depthPct,
      pricePerCarat,
      costPerCarat,
      video,
      legacy,
    },
    issues,
    notes,
    known: Boolean(certificate) && certificates.has(certKey(certificate)),
  };
}

export function checkStones(table: string[][], map: ColumnMap<StoneField>): CheckedLine<StoneRow>[] {
  const certificates = knownCertificates();
  const seenCert = new Map<string, number>();
  const seenStock = new Map<string, number>();
  return table.slice(1).map((r, i) => {
    const line = i + 2;
    const read = readStone((f) => (map[f] >= 0 ? (r[map[f]] ?? "").trim() : ""), certificates);
    const key = read.row.certificate ? certKey(read.row.certificate) : "";
    const firstCert = key ? seenCert.get(key) : undefined;
    if (key && firstCert === undefined) seenCert.set(key, line);
    const firstStock = read.row.stock ? seenStock.get(read.row.stock) : undefined;
    if (read.row.stock && firstStock === undefined) seenStock.set(read.row.stock, line);
    if (firstStock !== undefined) read.notes.push(`Stock ID ${read.row.stock} is also on line ${firstStock}, so the certificate tells them apart`);
    return toLine(line, read, firstCert !== undefined ? `Same certificate as line ${firstCert}` : null, true);
  });
}

/** How the file's shape and grade codes were read, for the check step: "RD Round", "I Ideal". */
export function codesReadAs(table: string[][], map: ColumnMap<StoneField>): string[] {
  const out: string[] = [];
  const col = (f: StoneField) => (map[f] >= 0 ? [...new Set(table.slice(1).map((r) => (r[map[f]] ?? "").trim()).filter(Boolean))] : []);
  const shapes = col("shape")
    .map((c) => [c, readShape(c)] as const)
    .filter(([c, sh]) => sh && c.toLowerCase() !== sh);
  if (shapes.length) out.push(`Shape codes read as ${shapes.map(([c, sh]) => `${c} ${SHAPE_LABEL[sh as StoneShape]}`).join(", ")}.`);
  const grades = [...new Set([...col("cut"), ...col("polish"), ...col("symmetry")])]
    .map((c) => [c, readGrade(c)] as const)
    .filter(([c, g]) => typeof g === "string" && c.toLowerCase() !== g.toLowerCase());
  if (grades.length) out.push(`Grades read as ${grades.map(([c, g]) => `${c} ${g as string}`).join(", ")}.`);
  return out;
}

export const STONE_TEMPLATE: string[][] = [
  STONE_FIELDS.map((f) => f.label),
  ["EXAMPLE001", "IGI", "SBD00001", "Cushion", "3.08", "F", "VVS2", "", "Excellent", "Excellent", "None", "66.1", "61", "10.37", "7.62", "5.04", "", "", "", ""],
];

