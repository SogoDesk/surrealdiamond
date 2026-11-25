/**
 * The Made to Order request's fields (BRD R-19; client feedback F-C2). The
 * fields are the live M2O form's, plus dimensions (the program grows "any
 * carat weight or dimensions"), asked as one or the other, and a text box
 * for a shape outside the list (client change request, November 2026), and
 * the grades and proportions the diamond search filters on, so a search
 * with nothing in stock carries into the request (client request, November
 * 2026): color and clarity as ranges, the lowest cut, polish, symmetry and
 * fluorescence wanted, and table and depth.
 * Labels, placeholders and hints live here so
 * Surreal's M2O specification (C-17) replaces this file and nothing else;
 * until it arrives the wording below is ours.
 */

import type { StoneShape } from "./diamonds";

export type M2OField =
  | "name"
  | "company"
  | "customer"
  | "phone"
  | "email"
  | "size"
  | "dimensions"
  | "shape"
  | "otherShape"
  | "ratio"
  | "table"
  | "depthPct"
  | "inscription"
  | "notes"
  | M2OGradeField;

/** Chosen from lists rather than typed: color and clarity as a range, the rest as the lowest grade wanted. */
export type M2OGradeField = "color" | "clarity" | "cut" | "polish" | "symmetry" | "fluorescence";

export interface M2OFieldSpec {
  label: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  type?: "text" | "number" | "tel" | "email";
  step?: string;
  wide?: boolean;
  autoComplete?: string;
}

export const M2O_FIELDS: Record<Exclude<M2OField, "shape" | "notes" | M2OGradeField>, M2OFieldSpec> & { notes: M2OFieldSpec } = {
  otherShape: { label: "Which shape?", placeholder: "Marquise, heart, a cut of your own", wide: true },
  size: { label: "Exact size requested (ct)", placeholder: "2.00", type: "number", step: "0.01" },
  dimensions: { label: "Dimensions (mm)", placeholder: "9.00 x 6.50", hint: "Length by width, for a stone sized to a setting" },
  ratio: { label: "Length to width ratio", placeholder: "1.40", optional: true, hint: "For fancy shapes" },
  table: { label: "Table %", placeholder: "57 to 62", optional: true },
  depthPct: { label: "Depth %", placeholder: "60 to 63", optional: true, hint: "Total depth" },
  inscription: { label: "Girdle inscription", placeholder: "Initials, a date or a short message", optional: true, wide: true, hint: "Laser inscribed on the girdle" },
  customer: { label: "Customer name (for the booklet)", placeholder: "As it should appear in your client's booklet", optional: true, wide: true },
  name: { label: "Your name", placeholder: "First and last name", autoComplete: "name" },
  company: { label: "Company name", placeholder: "Your store", autoComplete: "organization" },
  phone: { label: "Phone", placeholder: "(212) 555-0100", type: "tel", autoComplete: "tel" },
  email: { label: "Email", placeholder: "you@yourstore.com", type: "email", autoComplete: "email" },
  notes: { label: "Notes", placeholder: "The setting it is for, the date you need it by, anything else we should know", optional: true, wide: true },
};

/** Labels for the grade lists, in the order the form shows them. */
export const M2O_GRADES: { id: M2OGradeField; label: string; hint?: string }[] = [
  { id: "color", label: "Color" },
  { id: "clarity", label: "Clarity" },
  { id: "cut", label: "Cut", hint: "Round stones carry a cut grade" },
  { id: "polish", label: "Polish" },
  { id: "symmetry", label: "Symmetry" },
  { id: "fluorescence", label: "Fluorescence" },
];

/** The shapes offered on the live M2O form; anything else goes under Other. */
export const M2O_SHAPES: StoneShape[] = ["round", "radiant", "oval", "cushion", "emerald", "pear"];

/*
 * The program, in Surreal's words from its own M2O page (copied 25 November
 * 2026, at Surreal's request). The costs are not here on purpose: they are
 * dealer prices, so they come from the API to signed-in people only
 * (lib/m2oPricing.ts).
 */

/** The terms, one card each. */
export const M2O_TERMS: { title: string; line: string }[] = [
  { title: "Any shape, any size", line: "Order any diamond shape in any carat weight, size or dimensions." },
  { title: "Color and clarity", line: "Under 4 ct: F or G color or better, VS clarity or better. Over 4 ct: G color or better, VS clarity or better." },
  { title: "IGI certified", line: "Every M2O diamond comes with an IGI grading certificate." },
  { title: "Its story, in a brochure", line: "Each M2O diamond comes with a brochure of nine unique visual touchpoints tracking its creation." },
  { title: "6 to 8 weeks", line: "Delivery is 6 to 8 weeks from the confirmed order date." },
  { title: "Priced by the carat", line: "An M2O fee plus the diamond at a price per carat for its size. Surreal confirms the price after your request." },
];

/** The nine touchpoints the brochure follows, in order. */
export const M2O_TOUCHPOINTS = [
  "Starts with a seed",
  "Grow seed, grow",
  "Care for a biscuit?",
  "Turn up the heat",
  "Lasering and grinding",
  "Planning topology",
  "Roughing out the rough",
  "Final polish",
  "Quality check",
];

/** What the brochure records for each diamond. */
export const M2O_BROCHURE = [
  "An image of the initial seed, and its thickness",
  "The machine it grew in, and the date growth began",
  "The first biscuit latticework image, and the image after growth showing its diamond like carbon (DLC) edges",
  "The total days of growth, and the weight of the rough diamond",
  "An X-ray image of the rough stone, with the laser planning",
  "An image of the polished diamond, and its IGI grading report number",
  "The final color, clarity grade and carat weight",
  "Your client's name and a unique Provenance Report Number",
  "Your store's name and the delivery date",
  "The signature of the associate who delivers the diamond",
];

/** Sizes that mean something, from Surreal's own examples. */
export const M2O_IDEAS: { size: string; line: string }[] = [
  { size: "3.16 ct", line: "For John 3:16" },
  { size: "3.80 ct", line: "For a 38 and 0 championship season" },
];

/** Surreal's sample M2O sales brochure (a PDF on Google Drive, open to anyone with the link). */
export const M2O_SAMPLE_BROCHURE = "https://drive.google.com/file/d/1N4K6m-K7q60kQS3E4DLLO5MTDLbBRTfh/view?usp=drive_link";

/** The grade promise for a size, from the program facts. */
export const m2oGrade = (ct: number) => (ct > 4 ? "Over 4 ct: G color or better, VS clarity or better" : "Under 4 ct: F or G color or better, VS clarity or better");
