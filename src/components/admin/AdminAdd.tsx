"use client";

/**
 * Adding from the console: the side drawer every Add form opens in, the
 * forms themselves (a piece, a stone, a dealer customer, a staff member, a
 * custom role), and the photograph upload tile used by Banners and the
 * pop-up banner.
 *
 * The piece and stone forms read their values through lib/inventoryImport,
 * the same reader as the file uploads, and the staff form checks name, email
 * and role. None of the three saves yet: a valid form ends on "Checked, not
 * saved yet" with what would be stored, until the inventory backend (B2
 * pieces, B3 stones) and the staff screens (B6) connect them. Adding a
 * customer does save, into the same preview list the Excel import fills, and
 * can send the setup link at once.
 */

import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { trapTab, useDrawer } from "@/components/shop/useDrawer";
import { adminModules, type Access } from "@/content/admin";
import { categories, metals, type Metal } from "@/content/catalog";
import { CLARITIES, COLORS, FLUORESCENCE, GRADES, LABS, SHAPES, SHAPE_LABEL } from "@/content/diamonds";
import { FIELDS, checkRows, type Mapping } from "@/lib/customerImport";
import { API_AUTH } from "@/lib/api/client";
import { createSetupLink, importCustomers, useCustomers } from "@/lib/customers";
import { readPiece, readStone, type PieceField, type PieceRow, type StoneField, type StoneRow } from "@/lib/inventoryImport";
import { canDo, type RoleDef, type StaffDirectory, type StaffLink } from "@/lib/staffAdmin";
import s from "./admin.module.css";

/* The drawer */

export function AdminDrawer({ open, onClose, kicker, title, line, children }: { open: boolean; onClose: () => void; kicker: string; title: string; line?: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { onKeyDown } = useDrawer({ open, onClose, rootRef, panelRef, backdropRef, axis: "x" });
  return (
    <div ref={rootRef} className={s.drawerRoot} inert={!open} aria-hidden={!open} onKeyDown={onKeyDown}>
      <div ref={backdropRef} className={s.drawerBackdrop} onClick={onClose} />
      <div ref={panelRef} className={s.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={(e) => trapTab(e, panelRef.current)}>
        <header className={s.drawerHead}>
          <div>
            <p className={s.kicker}>{kicker}</p>
            <h2 id={titleId} className={s.drawerTitle}>
              {title}
            </h2>
            {line && <p className={s.muted}>{line}</p>}
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Close">
            <svg aria-hidden viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        </header>
        <div className={s.drawerBody}>{children}</div>
      </div>
    </div>
  );
}

/* Form pieces */

function Field({ label, hint, error, optional, children }: { label: string; hint?: string; error?: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.label}>
        {label}
        {optional && <span className={s.optionalText}> (optional)</span>}
      </span>
      {children}
      {error ? <span className={s.error}>{error}</span> : hint ? <span className={s.muted}>{hint}</span> : null}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.step}>
      <h3 className={s.stepTitle}>{title}</h3>
      {children}
    </section>
  );
}

/** The end of a form whose backend is not connected yet: what was checked, and that nothing was stored. */
function NotSavedYet({ facts, what, onAgain, onClose, again }: { facts: [string, string][]; what: string; onAgain: () => void; onClose: () => void; again: string }) {
  return (
    <section className={s.step} role="status">
      <h3 className={s.stepTitle}>Checked, not saved yet</h3>
      <dl className={s.payFacts}>
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <p className={s.warnNote}>Everything above passed the checks, but nothing was stored. Saving connects with {what}; until then this form shows what it will send.</p>
      <div className={s.cardTools}>
        <button type="button" className={s.primary} onClick={onAgain}>
          {again}
        </button>
        <button type="button" className={s.textBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}

const firstError = (form: HTMLFormElement | null) => window.setTimeout(() => form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);

/* Photographs picked from this computer */

export interface PickedPhoto {
  url: string;
  name: string;
  width: number;
  height: number;
  kb: number;
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_MB = 20;

/** Reads an image file for a preview: its size in pixels, or why it cannot be used. */
async function readPhoto(file: File): Promise<PickedPhoto> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error(`${file.name} is not a JPEG, PNG or WebP photograph.`);
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) throw new Error(`${file.name} is over ${PHOTO_MAX_MB} MB.`);
  const url = URL.createObjectURL(file);
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`${file.name} could not be opened as a photograph.`));
    img.src = url;
  });
  return { url, name: file.name, kb: Math.round(file.size / 1024), ...size };
}

/** Frees the preview addresses of every photograph picked while the form was open, once it closes. Removing one frees it at once. */
export function useRevokeOnUnmount(photos: (PickedPhoto | null)[]) {
  const seen = useRef(new Set<string>());
  const key = photos.map((p) => p?.url ?? "").join(" ");
  useEffect(() => {
    key.split(" ").filter(Boolean).forEach((u) => seen.current.add(u));
  }, [key]);
  useEffect(() => {
    const urls = seen.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);
}

/**
 * Two tiles for a photograph picker grid: the uploaded photograph, once one
 * is chosen, as a choice like the library's, and the tile that uploads one
 * from this computer. Saving uploads arrives with file storage (M1), so the
 * page decides what an uploaded choice can do; photoLine describes it.
 */
export function UploadPhotoTiles({ picked, selected, onPick, onSelect, onError, label, disabled, square }: { picked: PickedPhoto | null; selected: boolean; onPick: (p: PickedPhoto) => void; onSelect: () => void; onError: (message: string) => void; label: string; disabled?: boolean; square?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      {picked && (
        <button type="button" role="radio" aria-checked={selected} className={s.pickImg} onClick={onSelect} disabled={disabled} aria-label={`${label}: ${picked.name}, uploaded`}>
          <Image src={picked.url} alt="" width={240} height={square ? 300 : 103} sizes="160px" />
          <span className={s.uploadBadge}>Uploaded</span>
        </button>
      )}
      <button type="button" className={s.uploadTile} onClick={() => input.current?.click()} disabled={disabled}>
        <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
        </svg>
        {picked ? "Upload another" : "Upload"}
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        className={s.srOnly}
        tabIndex={-1}
        aria-label={`Upload a ${label.toLowerCase()}`}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const p = await readPhoto(f);
            onPick(p);
            onError("");
          } catch (err) {
            onError(err instanceof Error ? err.message : "That file could not be read.");
          }
        }}
      />
    </>
  );
}

/** The line under a picker about an uploaded photograph: its size, and a warning when it is smaller than the slot needs. */
export function photoLine(p: PickedPhoto, minWidth: number, minHeight: number): { text: string; small: boolean } {
  const small = p.width < minWidth || p.height < minHeight;
  return { small, text: `${p.name}: ${p.width} × ${p.height} px, ${p.kb.toLocaleString("en-US")} KB.${small ? ` Smaller than the ${minWidth} × ${minHeight} px this slot needs, so it may look soft.` : ""}` };
}

/* Add a piece */

const EMPTY_PIECE: Record<PieceField, string> = { style: "", name: "", category: "", metals: "", defaultMetal: "", detail: "", carats: "", price: "" };
const metalLabel = (m: Metal) => metals.find((x) => x.id === m)?.label ?? m;

export function AddPieceForm({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState(EMPTY_PIECE);
  const [chosen, setChosen] = useState<Metal[]>(["wg", "yg"]);
  const [opensIn, setOpensIn] = useState<Metal>("wg");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [issues, setIssues] = useState<Partial<Record<PieceField, string>>>({});
  const [done, setDone] = useState<{ row: PieceRow; notes: string[]; known: boolean } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  useRevokeOnUnmount(photos);

  const set = (k: PieceField, value: string) => setV((x) => ({ ...x, [k]: value }));
  const toggle = (m: Metal) => {
    const next = chosen.includes(m) ? chosen.filter((x) => x !== m) : [...chosen, m];
    setChosen(next);
    if (!next.includes(opensIn) && next[0]) setOpensIn(next[0]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!chosen.length) {
      setIssues({ metals: "Choose at least one metal" });
      return;
    }
    const read = readPiece((f) => (f === "metals" ? chosen.map(metalLabel).join(" / ") : f === "defaultMetal" ? metalLabel(opensIn) : v[f]));
    setIssues(read.issues);
    if (Object.keys(read.issues).length) return firstError(form.current);
    setDone({ row: read.row, notes: read.notes, known: read.known });
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: PickedPhoto[] = [];
    const errors: string[] = [];
    for (const f of Array.from(files).slice(0, 12)) {
      try {
        next.push(await readPhoto(f));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : f.name);
      }
    }
    setPhotos((p) => [...p, ...next].slice(0, 12));
    setPhotoError(errors.join(" "));
  };

  if (done) {
    const r = done.row;
    return (
      <NotSavedYet
        what="the catalog backend"
        again="Add another piece"
        onClose={onClose}
        onAgain={() => {
          setDone(null);
          setV(EMPTY_PIECE);
          photos.forEach((p) => URL.revokeObjectURL(p.url));
          setPhotos([]);
        }}
        facts={[
          ["Style number", `${r.style}${done.known ? " (already in the catalog: this would update it)" : ""}`],
          ["Name", r.name],
          ["Category", categories.find((c) => c.id === r.category)?.label ?? ""],
          ["Metals", r.metals.map(metalLabel).join(", ")],
          ["Opens in", r.defaultMetal ? metalLabel(r.defaultMetal) : ""],
          ["Short description", r.detail],
          ["Carat options", r.carats.map((c) => c.toFixed(2)).join(", ")],
          ["Dealer price", r.price !== null ? `$${r.price.toLocaleString("en-US")}` : "From the price list"],
          ["Photographs", photos.length ? `${photos.length} checked` : "None yet"],
          ["Notes", done.notes.join(". ")],
        ]}
      />
    );
  }

  const err = (k: PieceField) => issues[k];
  return (
    <form ref={form} className={s.stepForm} onSubmit={submit} noValidate>
      <Section title="The piece">
        <div className={s.formRow}>
          <Field label="Style number" error={err("style")} hint="One per piece, as in RightClick">
            <input className={s.input} value={v.style} onChange={(e) => set("style", e.target.value)} placeholder="For example LE2004W442" aria-invalid={err("style") ? true : undefined} autoComplete="off" />
          </Field>
          <Field label="Category" error={err("category")}>
            <select className={s.select} value={v.category} onChange={(e) => set("category", e.target.value)} aria-invalid={err("category") ? true : undefined}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Name" error={err("name")} hint="As dealers see it">
          <input className={s.input} value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="For example Oval Halo Engagement Ring" aria-invalid={err("name") ? true : undefined} />
        </Field>
        <Field label="Short description" optional hint="One line under the name">
          <input className={s.input} value={v.detail} onChange={(e) => set("detail", e.target.value)} placeholder="For example Oval center, pave halo" />
        </Field>
      </Section>

      <Section title="Metals and sizes">
        <div className={s.field}>
          <span className={s.label}>Offered in</span>
          <span className={s.metalToggles} role="group" aria-label="Metals offered">
            {metals.map((m) => (
              <button key={m.id} type="button" className={s.metalToggle} aria-pressed={chosen.includes(m.id)} onClick={() => toggle(m.id)}>
                <span style={{ background: m.swatch }} />
                {m.label}
              </button>
            ))}
          </span>
          {err("metals") && <span className={s.error}>{err("metals")}</span>}
        </div>
        <div className={s.formRow}>
          <Field label="Opens in" hint="The metal shown first">
            <select className={s.select} value={opensIn} onChange={(e) => setOpensIn(e.target.value as Metal)} disabled={chosen.length < 2}>
              {chosen.map((m) => (
                <option key={m} value={m}>
                  {metalLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Carat options" optional error={err("carats")} hint="Separated by commas">
            <input className={s.input} value={v.carats} onChange={(e) => set("carats", e.target.value)} placeholder="0.50, 1.00, 1.50" inputMode="decimal" aria-invalid={err("carats") ? true : undefined} />
          </Field>
        </div>
        <Field label="Dealer price" optional error={err("price")} hint="US dollars. Left blank, the store's price list sets it">
          <input className={s.input} value={v.price} onChange={(e) => set("price", e.target.value)} placeholder="For example 1450" inputMode="decimal" aria-invalid={err("price") ? true : undefined} />
        </Field>
      </Section>

      <Section title="Photographs">
        <p className={s.muted}>Renders on white, square, at least 1,200 px. They are checked here; storing them arrives with file storage (M1).</p>
        {photos.length > 0 && (
          <ul className={s.photoGrid}>
            {photos.map((p, i) => (
              <li key={p.url}>
                <Image src={p.url} alt={p.name} width={160} height={160} sizes="96px" />
                <span className={p.width < 1200 || p.height < 1200 ? s.warnText : s.muted}>
                  {p.width} × {p.height}
                </span>
                <button type="button" className={s.textBtn} onClick={() => {
                    URL.revokeObjectURL(p.url);
                    setPhotos((all) => all.filter((_, j) => j !== i));
                  }} aria-label={`Remove ${p.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={s.cardTools}>
          <button type="button" className={s.secondaryBtn} onClick={() => photoInput.current?.click()}>
            Upload photographs
          </button>
          <span className={s.muted}>JPEG, PNG or WebP, up to 12</span>
        </div>
        <input ref={photoInput} type="file" multiple accept={PHOTO_TYPES.join(",")} className={s.srOnly} tabIndex={-1} onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
        {photoError && <span className={s.error}>{photoError}</span>}
      </Section>

      <div className={s.cardTools}>
        <button type="submit" className={s.primary}>
          Check and add
        </button>
        <button type="button" className={s.textBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Add a stone */

const EMPTY_STONE: Record<StoneField, string> = {
  certificate: "",
  lab: "IGI",
  stock: "",
  shape: "",
  carat: "",
  color: "",
  clarity: "",
  cut: "",
  polish: "",
  symmetry: "",
  fluorescence: "",
  depthPct: "",
  tablePct: "",
  length: "",
  width: "",
  depth: "",
  price: "",
  cost: "",
  video: "",
  legacy: "",
};

const money = (n: number | null) => (n === null ? "" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export function AddStoneForm({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState(EMPTY_STONE);
  const [issues, setIssues] = useState<Partial<Record<StoneField, string>>>({});
  const [done, setDone] = useState<{ row: StoneRow; notes: string[]; known: boolean } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const set = (k: StoneField, value: string) => setV((x) => ({ ...x, [k]: value }));
  const err = (k: StoneField) => issues[k];
  const invalid = (k: StoneField) => (issues[k] ? true : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const read = readStone((f) => v[f]);
    setIssues(read.issues);
    if (Object.keys(read.issues).length) return firstError(form.current);
    setDone({ row: read.row, notes: read.notes, known: read.known });
  };

  if (done) {
    const r = done.row;
    const mm = [r.length, r.width, r.depth].every((x) => x !== null) ? `${r.length} × ${r.width} × ${r.depth} mm` : "";
    return (
      <NotSavedYet
        what="the stones backend"
        again="Add another stone"
        onClose={onClose}
        onAgain={() => {
          setDone(null);
          setV(EMPTY_STONE);
        }}
        facts={[
          ["Certificate", `${r.lab} ${r.certificate}${done.known ? " (already listed: this would update it)" : ""}`],
          ["Stock ID", r.stock],
          ["Stone", `${r.carat?.toFixed(2)} ct ${r.shape ? SHAPE_LABEL[r.shape] : ""}, ${r.color} ${r.clarity}`],
          ["Cut, polish, symmetry", [r.cut, r.polish, r.symmetry].map((g) => g ?? "None").join(", ")],
          ["Fluorescence", r.fluorescence ?? "Not given"],
          ["Measurements", mm],
          ["Table, depth", r.tablePct !== null || r.depthPct !== null ? `${r.tablePct ?? "?"}%, ${r.depthPct ?? "?"}%` : ""],
          ["Price per carat", money(r.pricePerCarat)],
          ["Stone price", r.pricePerCarat !== null && r.carat !== null ? money(Math.round(r.pricePerCarat * r.carat * 100) / 100) : ""],
          ["Video", r.video ? "Linked" : "None"],
          ["Diamond Legacy", r.legacy ? "Yes" : "No"],
          ["Notes", done.notes.join(". ")],
        ]}
      />
    );
  }

  const grade = (k: "cut" | "polish" | "symmetry", label: string, hint?: string) => (
    <Field label={label} optional hint={hint}>
      <select className={s.select} value={v[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">Not given</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </Field>
  );
  const num = (k: StoneField, label: string, hint?: string, optional = true) => (
    <Field label={label} optional={optional} error={err(k)} hint={hint}>
      <input className={s.input} value={v[k]} onChange={(e) => set(k, e.target.value)} inputMode="decimal" aria-invalid={invalid(k)} />
    </Field>
  );

  return (
    <form ref={form} className={s.stepForm} onSubmit={submit} noValidate>
      <Section title="The stone">
        <div className={s.formRow}>
          <Field label="Certificate number" error={err("certificate")} hint="The lab report number">
            <input className={s.input} value={v.certificate} onChange={(e) => set("certificate", e.target.value)} placeholder="For example LG810610755" aria-invalid={invalid("certificate")} autoComplete="off" />
          </Field>
          <Field label="Lab" error={err("lab")}>
            <select className={s.select} value={v.lab} onChange={(e) => set("lab", e.target.value)} aria-invalid={invalid("lab")}>
              {LABS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className={s.formRow}>
          <Field label="Shape" error={err("shape")}>
            <select className={s.select} value={v.shape} onChange={(e) => set("shape", e.target.value)} aria-invalid={invalid("shape")}>
              <option value="">Choose a shape</option>
              {SHAPES.map((sh) => (
                <option key={sh} value={sh}>
                  {SHAPE_LABEL[sh]}
                </option>
              ))}
            </select>
          </Field>
          {num("carat", "Carat", "For example 1.52", false)}
        </div>
        <Field label="Stock ID" optional hint="Surreal's own code; the certificate is what tells stones apart">
          <input className={s.input} value={v.stock} onChange={(e) => set("stock", e.target.value)} placeholder="For example SBD10755" autoComplete="off" />
        </Field>
      </Section>

      <Section title="Grades">
        <div className={s.formRow}>
          <Field label="Color" error={err("color")}>
            <select className={s.select} value={v.color} onChange={(e) => set("color", e.target.value)} aria-invalid={invalid("color")}>
              <option value="">Choose</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Clarity" error={err("clarity")}>
            <select className={s.select} value={v.clarity} onChange={(e) => set("clarity", e.target.value)} aria-invalid={invalid("clarity")}>
              <option value="">Choose</option>
              {CLARITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className={s.formRow}>
          {grade("cut", "Cut", "Round stones carry a cut grade")}
          {grade("polish", "Polish")}
        </div>
        <div className={s.formRow}>
          {grade("symmetry", "Symmetry")}
          <Field label="Fluorescence" optional>
            <select className={s.select} value={v.fluorescence} onChange={(e) => set("fluorescence", e.target.value)}>
              <option value="">Not given</option>
              {FLUORESCENCE.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Measurements">
        <div className={s.formRow}>
          {num("length", "Length (mm)")}
          {num("width", "Width (mm)")}
        </div>
        <div className={s.formRow}>
          {num("depth", "Depth (mm)")}
          {num("tablePct", "Table %")}
        </div>
        <div className={s.formRow}>{num("depthPct", "Depth %", "Total depth")}</div>
      </Section>

      <Section title="Price and media">
        <div className={s.formRow}>
          {num("price", "Price per carat", "What dealers pay, US dollars")}
          {num("cost", "Cost per carat", "Staff only, never shown to dealers")}
        </div>
        <Field label="Video link" optional error={err("video")} hint="An https link to the stone's video">
          <input className={s.input} value={v.video} onChange={(e) => set("video", e.target.value)} placeholder="https://" inputMode="url" />
        </Field>
        <label className={s.switchRow}>
          <input type="checkbox" checked={v.legacy === "yes"} onChange={(e) => set("legacy", e.target.checked ? "yes" : "")} />
          <span>
            Diamond Legacy stone
            <span className={s.muted}> Shows in Start a Legacy as well as the diamond search.</span>
          </span>
        </label>
      </Section>

      <div className={s.cardTools}>
        <button type="submit" className={s.primary}>
          Check and add
        </button>
        <button type="button" className={s.textBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Add a customer */

const CUSTOMER_FIELDS = FIELDS.map((f) => f.id);
type CustomerField = (typeof CUSTOMER_FIELDS)[number];

export function AddCustomerForm({ onClose, onLinks }: { onClose: () => void; onLinks: (links: { name: string; email: string; url: string }[]) => void }) {
  const existing = useCustomers();
  const [v, setV] = useState<Record<CustomerField, string>>(() => Object.fromEntries(CUSTOMER_FIELDS.map((f) => [f, f === "role" ? "Owner" : ""])) as Record<CustomerField, string>);
  const [issues, setIssues] = useState<string[]>([]);
  const [added, setAdded] = useState<{ id: string; name: string; email: string; company: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: CustomerField, value: string) => setV((x) => ({ ...x, [k]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const map = Object.fromEntries(CUSTOMER_FIELDS.map((f, i) => [f, i])) as Mapping;
    const [checked] = checkRows([CUSTOMER_FIELDS, CUSTOMER_FIELDS.map((f) => v[f])], map, existing);
    const problems = [...checked.issues];
    if (checked.status === "update") problems.push(`${checked.row.email} is already a customer. Find them in the list to resend their link.`);
    setIssues(problems);
    if (problems.length) return;
    const { added: rows } = importCustomers([checked.row]);
    const c = rows[0];
    if (c) setAdded({ id: c.id, name: c.contact || c.email, email: c.email, company: c.company });
  };

  if (added) {
    return (
      <section className={s.step} role="status">
        <h3 className={s.stepTitle}>Added to the customers</h3>
        <p className={s.muted}>
          {added.name}, {added.company}, is listed as Not invited. Send the setup link now, or later from the list.
        </p>
        <div className={s.cardTools}>
          <button
            type="button"
            className={s.primary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { url } = await createSetupLink(added.id);
              onLinks([{ name: `${added.name}, ${added.company}`, email: added.email, url }]);
              onClose();
            }}
          >
            Send the setup link
          </button>
          <button type="button" className={s.textBtn} onClick={onClose}>
            Later
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className={s.stepForm} onSubmit={submit} noValidate>
      <Section title="The store">
        <div className={s.formRow}>
          <Field label="Company">
            <input className={s.input} value={v.company} onChange={(e) => set("company", e.target.value)} placeholder="The store's name" />
          </Field>
          <Field label="Account code" optional hint="RightClick customer code">
            <input className={s.input} value={v.account} onChange={(e) => set("account", e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <div className={s.formRow}>
          <Field label="City" optional>
            <input className={s.input} value={v.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State" optional hint="Two letters">
            <input className={s.input} value={v.state} onChange={(e) => set("state", e.target.value)} maxLength={2} />
          </Field>
        </div>
      </Section>
      <Section title="The person">
        <div className={s.formRow}>
          <Field label="Contact name">
            <input className={s.input} value={v.contact} onChange={(e) => set("contact", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Email" hint="Their login, one per person">
            <input className={s.input} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <div className={s.formRow}>
          <Field label="Phone" optional>
            <input className={s.input} type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Role" hint="Owners see billing and manage associates">
            <select className={s.select} value={v.role} onChange={(e) => set("role", e.target.value)}>
              <option>Owner</option>
              <option>Associate</option>
            </select>
          </Field>
        </div>
      </Section>
      {issues.length > 0 && (
        <p className={s.error} role="alert">
          {issues.join(". ")}.
        </p>
      )}
      <p className={s.note}>No password is set here. The customer chooses their own from the setup link.</p>
      <div className={s.cardTools}>
        <button type="submit" className={s.primary}>
          Add the customer
        </button>
        <button type="button" className={s.textBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Add a staff member */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Adds a person to the staff list with one role. Roles offered are the ones
 * the signed-in person may give (only an administrator gives Administrator).
 */
export function AddStaffForm({ dir, by, myRole, onClose, onLink }: { dir: StaffDirectory; by: string; myRole: string; onClose: () => void; onLink: (link: StaffLink) => void }) {
  const may = canDo(myRole, "edit");
  const roles = dir.roles.filter((r) => may.giveRole(r.id));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles.find((r) => r.id === "sales")?.id ?? roles[0]?.id ?? "");
  const [issues, setIssues] = useState<{ name?: string; email?: string; form?: string }>({});
  const [added, setAdded] = useState<{ name: string; email: string; role: string; link: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { name?: string; email?: string; form?: string } = {};
    if (name.trim().length < 2) next.name = "Enter their full name";
    if (!EMAIL.test(email.trim())) next.email = email.trim() ? `"${email.trim()}" is not an email address` : "Enter their work email";
    if (!Object.keys(next).length) {
      setBusy(true);
      try {
        const res = await dir.add({ name: name.trim(), email: email.trim().toLowerCase(), role }, by);
        if (res.link) onLink(res.link);
        setAdded({ name: name.trim(), email: email.trim().toLowerCase(), role, link: Boolean(res.link) });
      } catch (err) {
        const fields = (err as { fields?: Record<string, string> }).fields;
        if (fields?.email || fields?.name) Object.assign(next, { email: fields.email, name: fields.name });
        else next.email = err instanceof Error ? err.message : "They could not be added.";
      }
      setBusy(false);
    }
    setIssues(next);
    if (Object.keys(next).length) firstError(form.current);
  };

  if (added) {
    return (
      <section className={s.step} role="status">
        <h3 className={s.stepTitle}>Added to the staff list</h3>
        <p className={s.muted}>
          {added.name}, {added.email}, as {dir.roles.find((r) => r.id === added.role)?.label ?? added.role}.
        </p>
        <p className={API_AUTH && added.link ? s.warnNote : s.note}>
          {API_AUTH
            ? added.link
              ? "Email is not set up yet, so their setup link is on the Staff and roles page, under Setup link to pass on. Send it to them privately."
              : "Their setup link is on its way by email. They choose their own password."
            : "Preview: choose them in Signed in as at the top to see the console with their role."}
        </p>
        <div className={s.cardTools}>
          <button
            type="button"
            className={s.primary}
            onClick={() => {
              setAdded(null);
              setName("");
              setEmail("");
            }}
          >
            Add someone else
          </button>
          <button type="button" className={s.textBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    );
  }

  return (
    <form ref={form} className={s.stepForm} onSubmit={submit} noValidate>
      <Section title="The person">
        <Field label="Full name" error={issues.name}>
          <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={issues.name ? true : undefined} autoComplete="off" />
        </Field>
        <Field label="Work email" error={issues.email} hint="Their console login">
          <input className={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={issues.email ? true : undefined} autoComplete="off" />
        </Field>
      </Section>
      <Section title="Role">
        <div className={s.radioList} role="radiogroup" aria-label="Role">
          {roles.map((r) => (
            <label key={r.id} className={s.switchRow}>
              <input type="radio" name="staff-role" checked={role === r.id} onChange={() => setRole(r.id)} />
              <span>
                {r.label}
                {!r.builtIn && <span className={s.muted}> Custom role</span>}
                <span className={s.muted}>{r.line}</span>
              </span>
            </label>
          ))}
        </div>
        {myRole !== "administrator" && <p className={s.muted}>Only an administrator can make someone an administrator.</p>}
      </Section>
      <p className={s.note}>No password is set here. They choose their own from a setup link, and can turn on two factor sign in themselves.</p>
      <div className={s.cardTools}>
        <button type="submit" className={s.primary} disabled={busy}>
          {busy ? "Adding" : "Add to the staff list"}
        </button>
        <button type="button" className={s.textBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Create or edit a role */

const ACCESS_LABEL: Record<Access, string> = { edit: "Edit", view: "View", none: "None" };

/** A custom role: its name, what it is for, and its access to each module, started from an existing role if wanted. */
export function RoleForm({ role, dir, by, onClose }: { role?: RoleDef; dir: StaffDirectory; by: string; onClose: () => void }) {
  const blank = Object.fromEntries(adminModules.map((m) => [m.id, m.id === "overview" ? "view" : "none"])) as Record<string, Access>;
  const [label, setLabel] = useState(role?.label ?? "");
  const [line, setLine] = useState(role?.line ?? "");
  const [access, setAccess] = useState<Record<string, Access>>(role?.access ?? blank);
  const [issues, setIssues] = useState<{ label?: string; form?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { label?: string; form?: string } = {};
    if (label.trim().length < 2) next.label = "Give the role a name";
    if (!next.label) {
      setBusy(true);
      try {
        await dir.saveRole({ id: role?.id, label: label.trim(), line: line.trim() || "Custom role", access }, by);
        setBusy(false);
        onClose();
        return;
      } catch (err) {
        next.label = err instanceof Error ? err.message : "The role could not be saved.";
      }
      setBusy(false);
    }
    setIssues(next);
    firstError(form.current);
  };

  return (
    <form ref={form} className={s.stepForm} onSubmit={submit} noValidate>
      <Section title="The role">
        <Field label="Name" error={issues.label} hint="For example Marketing, or Warehouse">
          <input className={s.input} value={label} onChange={(e) => setLabel(e.target.value)} aria-invalid={issues.label ? true : undefined} autoComplete="off" />
        </Field>
        <Field label="What it is for" optional hint="One line, shown beside the role">
          <input className={s.input} value={line} onChange={(e) => setLine(e.target.value)} placeholder="For example Banners and the pop up banner" />
        </Field>
        {!role && (
          <Field label="Start from" optional hint="Copies that role's access; change any module below">
            <select
              className={s.select}
              defaultValue=""
              onChange={(e) => {
                const from = dir.roles.find((r) => r.id === e.target.value);
                if (from) setAccess({ ...from.access });
              }}
            >
              <option value="">No access except Overview</option>
              {dir.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Section>
      <Section title="Access to each module">
        <ul className={s.accessList}>
          {adminModules.map((m) => (
            <li key={m.id}>
              <span className={s.orderText}>
                <strong>{m.label}</strong>
                {m.line}
              </span>
              {m.id === "overview" ? (
                <span className={s.accessChip} data-access="view">
                  View, for every role
                </span>
              ) : (
                <span className={s.segRow} role="radiogroup" aria-label={`${m.label} access`}>
                  {(["edit", "view", "none"] as const).map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={access[m.id] === a} className={s.segBtn} onClick={() => setAccess((x) => ({ ...x, [m.id]: a }))}>
                      {ACCESS_LABEL[a]}
                    </button>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className={s.muted}>Edit lets them change a module; View shows it with editing off; None locks it.</p>
      </Section>
      {issues.form && (
        <p className={s.error} role="alert">
          {issues.form}
        </p>
      )}
      <div className={s.cardTools}>
        <button type="submit" className={s.primary} disabled={busy}>
          {busy ? "Saving" : role ? "Save the role" : "Create the role"}
        </button>
        <button type="button" className={s.textBtn} onClick={onClose}>
          Cancel
        </button>
        {role && !confirmDelete && (
          <button type="button" className={s.textBtn} onClick={() => setConfirmDelete(true)}>
            Delete this role
          </button>
        )}
        {role && confirmDelete && (
          <button
            type="button"
            className={s.dangerBtn}
            onClick={async () => {
              try {
                await dir.deleteRole(role.id, by);
                onClose();
              } catch (err) {
                setIssues({ form: err instanceof Error ? err.message : "The role could not be deleted." });
                setConfirmDelete(false);
              }
            }}
          >
            Delete {role.label}
          </button>
        )}
      </div>
    </form>
  );
}
