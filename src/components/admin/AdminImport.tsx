"use client";

/**
 * Uploading inventory from a file, in the four steps the dealer import uses:
 * upload (Excel or CSV, header row first, with a template), match columns
 * (recognised by name, the stone feed's interchange_ headers included, each
 * one changeable), check every row (new, update, or skipped with the reason,
 * plus notes on what was read loosely and how codes were read), and done.
 *
 * Pieces and stones share the wizard; each has its spec below. Nothing is
 * loaded yet: the done step says what would go in, offers the check report
 * as a CSV, and the inventory backend (B2 pieces, B3 stones) makes the last
 * step load the rows.
 */

import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { categories, metals } from "@/content/catalog";
import { SHAPE_LABEL } from "@/content/diamonds";
import { readTable } from "@/lib/customerImport";
import { downloadCsv } from "@/lib/csv";
import {
  PIECE_FIELDS,
  PIECE_TEMPLATE,
  STONE_FIELDS,
  STONE_TEMPLATE,
  checkPieces,
  checkStones,
  codesReadAs,
  matchColumns,
  type CheckedLine,
  type ColumnMap,
  type ImportField,
  type PieceField,
  type PieceRow,
  type StoneField,
  type StoneRow,
} from "@/lib/inventoryImport";
import s from "./admin.module.css";

export interface ImportSpec<F extends string, R> {
  title: string;
  line: string;
  /** Singular and plural, for "Check 5,512 stones". */
  noun: [string, string];
  fields: ImportField<F>[];
  max: number;
  template: { file: string; rows: string[][] };
  check: (table: string[][], map: ColumnMap<F>) => CheckedLine<R>[];
  readAs?: (table: string[][], map: ColumnMap<F>) => string[];
  columns: { label: string; cell: (r: R) => ReactNode }[];
  /** What loads the rows once connected, for "Loading them connects with ...". */
  backend: string;
}

type Step = "upload" | "match" | "check" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "match", label: "Match columns" },
  { id: "check", label: "Check rows" },
  { id: "done", label: "Done" },
];
const ROW_LABEL = { new: "New", update: "Update", error: "Skipped" } as const;
const SHOW = 200;
const fmt = (n: number) => n.toLocaleString("en-US");

export function ImportWizard<F extends string, R>({ spec, onClose }: { spec: ImportSpec<F, R>; onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState("");
  const [table, setTable] = useState<string[][]>([]);
  const [map, setMap] = useState<ColumnMap<F> | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [over, setOver] = useState(false);
  const [filter, setFilter] = useState<"all" | "notes" | CheckedLine<R>["status"]>("all");
  const input = useRef<HTMLInputElement>(null);
  const [one, many] = spec.noun;

  const rows = useMemo(() => (map && step !== "upload" && step !== "match" ? spec.check(table, map) : []), [spec, table, map, step]);
  const counts = useMemo(
    () => ({
      new: rows.filter((r) => r.status === "new").length,
      update: rows.filter((r) => r.status === "update").length,
      error: rows.filter((r) => r.status === "error").length,
      notes: rows.filter((r) => r.status !== "error" && r.notes.length > 0).length,
    }),
    [rows],
  );
  const readAs = useMemo(() => (map && spec.readAs && rows.length ? spec.readAs(table, map) : []), [spec, table, map, rows.length]);
  const missing = map ? spec.fields.filter((f) => f.required && map[f.id] < 0) : [];
  const ready = counts.new + counts.update;
  const noun = (n: number) => (n === 1 ? one : many);

  const read = async (f: File | undefined) => {
    if (!f) return;
    setReading(true);
    try {
      const t = await readTable(f, { noun: one, max: spec.max });
      setFile(f.name);
      setTable(t);
      setMap(matchColumns(spec.fields, t[0]));
      setError("");
      setFilter("all");
      setStep("match");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be read.");
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void read(e.dataTransfer.files[0]);
  };

  const report = () =>
    downloadCsv(`${file.replace(/\.[a-z]+$/i, "")} check.csv`, [
      ["Line", "Result", "Why it was skipped", "Notes", ...table[0]],
      ...rows.map((r) => [r.line, ROW_LABEL[r.status], r.issues.join("; "), r.notes.join("; "), ...table[r.line - 1]]),
    ]);

  const at = STEPS.findIndex((x) => x.id === step);
  const shown = filter === "all" ? rows : filter === "notes" ? rows.filter((r) => r.status !== "error" && r.notes.length) : rows.filter((r) => r.status === filter);

  return (
    <section className={s.card} aria-labelledby="upload-title">
      <div className={s.cardHead}>
        <div>
          <h2 id="upload-title" className={s.cardTitle}>
            {spec.title}
          </h2>
          <p className={s.muted}>{spec.line}</p>
        </div>
        <button type="button" className={s.textBtn} onClick={onClose}>
          {step === "done" ? "Close" : "Cancel"}
        </button>
      </div>

      <ol className={s.steps} aria-label="Upload steps">
        {STEPS.map((x, i) => (
          <li key={x.id} data-state={i < at ? "done" : i === at ? "current" : undefined} aria-current={i === at ? "step" : undefined}>
            <span>{i + 1}</span>
            {x.label}
          </li>
        ))}
      </ol>

      {step === "upload" && (
        <>
          <label
            className={s.drop}
            data-over={over || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={drop}
          >
            <input ref={input} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className={s.srOnly} onChange={(e) => read(e.target.files?.[0])} />
            <svg aria-hidden viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
            </svg>
            <strong>{reading ? "Reading the file" : "Drop a file here, or choose one"}</strong>
            <span className={s.muted}>
              Excel (.xlsx) or CSV, header row first, up to {fmt(spec.max)} {many}
            </span>
          </label>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          <div className={s.cardTools}>
            <button type="button" className={s.textBtn} onClick={() => downloadCsv(spec.template.file, spec.template.rows)}>
              Download the CSV template
            </button>
          </div>
        </>
      )}

      {step === "match" && map && (
        <>
          <p className={s.muted}>
            <strong className={s.fileName}>{file}</strong> · {fmt(table.length - 1)} rows. We matched the columns we recognised; check each one. Fields marked required must have a column.
          </p>
          <div className={s.mapList}>
            {spec.fields.map((f) => {
              const col = map[f.id];
              const example = col >= 0 ? table.slice(1).find((r) => r[col])?.[col] : "";
              return (
                <label key={f.id} className={s.mapRow} data-missing={f.required && col < 0 ? "" : undefined}>
                  <span className={s.mapField}>
                    <strong>
                      {f.label}
                      {f.required && <em> required</em>}
                    </strong>
                    <span className={s.muted}>{f.hint}</span>
                  </span>
                  <select className={s.select} value={col} onChange={(e) => setMap({ ...map, [f.id]: Number(e.target.value) })}>
                    <option value={-1}>Not in this file</option>
                    {table[0].map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <span className={s.mapExample}>{example ? `e.g. ${example}` : ""}</span>
                </label>
              );
            })}
          </div>
          {missing.length > 0 && (
            <p className={s.error} role="alert">
              Choose the column for {missing.map((f) => f.label).join(" and ")}.
            </p>
          )}
          <div className={s.cardTools}>
            <button type="button" className={s.primary} disabled={missing.length > 0} onClick={() => setStep("check")}>
              Check {fmt(table.length - 1)} {noun(table.length - 1)}
            </button>
            <button type="button" className={s.textBtn} onClick={() => setStep("upload")}>
              Choose another file
            </button>
          </div>
        </>
      )}

      {step === "check" && (
        <>
          <div className={s.checkSummary} role="radiogroup" aria-label="Filter rows">
            {(["all", "new", "update", "error", "notes"] as const).map((k) => (
              <button key={k} type="button" className={s.segBtn} aria-checked={filter === k} role="radio" onClick={() => setFilter(k)}>
                {k === "all" ? `All ${fmt(rows.length)}` : k === "notes" ? `With notes ${fmt(counts.notes)}` : `${ROW_LABEL[k]} ${fmt(counts[k])}`}
              </button>
            ))}
          </div>
          {readAs.length > 0 && (
            <p className={s.note}>
              {readAs.join(" ")} If a code means something else, tell us before the first real load.
            </p>
          )}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Result</th>
                  {spec.columns.map((c) => (
                    <th key={c.label} scope="col">
                      {c.label}
                    </th>
                  ))}
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, SHOW).map((r) => (
                  <tr key={r.line}>
                    <th scope="row" className="tabular">
                      {r.line}
                    </th>
                    <td>
                      <span className={s.statusChip} data-status={r.status}>
                        {ROW_LABEL[r.status]}
                      </span>
                    </td>
                    {spec.columns.map((c) => (
                      <td key={c.label}>{c.cell(r.row)}</td>
                    ))}
                    <td className={s.notesCell}>
                      {r.issues.map((x) => (
                        <span key={x} className={s.error}>
                          {x}
                        </span>
                      ))}
                      {r.notes.map((x) => (
                        <span key={x} className={s.muted}>
                          {x}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > SHOW && (
            <p className={s.muted}>
              Showing the first {SHOW} of {fmt(shown.length)} rows. The check report has every row.
            </p>
          )}
          <div className={s.cardTools}>
            <button type="button" className={s.primary} disabled={ready === 0} onClick={() => setStep("done")}>
              Continue with {fmt(ready)} {noun(ready)}
            </button>
            <button type="button" className={s.textBtn} onClick={report}>
              Download the check report
            </button>
            <button type="button" className={s.textBtn} onClick={() => setStep("match")}>
              Back to columns
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <>
          <dl className={s.resultList}>
            <div>
              <dt>New</dt>
              <dd>{fmt(counts.new)}</dd>
            </div>
            <div>
              <dt>Updates</dt>
              <dd>{fmt(counts.update)}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>{fmt(counts.error)}</dd>
            </div>
            <div>
              <dt>With notes</dt>
              <dd>{fmt(counts.notes)}</dd>
            </div>
          </dl>
          <p className={s.warnNote}>
            Checked, not loaded yet. {fmt(ready)} {noun(ready)} from {file} passed the checks, but nothing was stored. Loading them connects with {spec.backend}; then this step puts
            them in the live list.
          </p>
          <div className={s.cardTools}>
            <button type="button" className={s.primary} onClick={onClose}>
              Back to the list
            </button>
            <button type="button" className={s.textBtn} onClick={report}>
              Download the check report
            </button>
            <button type="button" className={s.textBtn} onClick={() => setStep("upload")}>
              Upload another file
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* The two uploads */

const metalLabel = (id: string) => metals.find((m) => m.id === id)?.label ?? id;
const dash = "";

export const PIECE_UPLOAD: ImportSpec<PieceField, PieceRow> = {
  title: "Upload pieces",
  line: "Many pieces at once from an Excel workbook or CSV: style number, name, category, metals and sizes. Photographs are added per piece.",
  noun: ["piece", "pieces"],
  fields: PIECE_FIELDS,
  max: 5000,
  template: { file: "surreal pieces template.csv", rows: PIECE_TEMPLATE },
  check: checkPieces,
  columns: [
    { label: "Style", cell: (r) => <span className="tabular">{r.style}</span> },
    { label: "Name", cell: (r) => r.name },
    { label: "Category", cell: (r) => categories.find((c) => c.id === r.category)?.label ?? dash },
    { label: "Metals", cell: (r) => r.metals.map(metalLabel).join(", ") },
    { label: "Carats", cell: (r) => r.carats.map((c) => c.toFixed(2)).join(", ") },
  ],
  backend: "the catalog backend",
};

export const STONE_UPLOAD: ImportSpec<StoneField, StoneRow> = {
  title: "Upload stones",
  line: "A stone feed or inventory export, as Excel or CSV. The feed's own column names are recognised. Cost stays staff only.",
  noun: ["stone", "stones"],
  fields: STONE_FIELDS,
  max: 20000,
  template: { file: "surreal stones template.csv", rows: STONE_TEMPLATE },
  check: checkStones,
  readAs: codesReadAs,
  columns: [
    { label: "Certificate", cell: (r) => <span className="tabular">{[r.lab, r.certificate].filter(Boolean).join(" ")}</span> },
    { label: "Stock", cell: (r) => <span className="tabular">{r.stock}</span> },
    { label: "Shape", cell: (r) => (r.shape ? SHAPE_LABEL[r.shape] : dash) },
    { label: "Carat", cell: (r) => <span className="tabular">{r.carat?.toFixed(2) ?? dash}</span> },
    { label: "Color", cell: (r) => r.color ?? dash },
    { label: "Clarity", cell: (r) => r.clarity ?? dash },
    { label: "Cut, polish, sym.", cell: (r) => [r.cut, r.polish, r.symmetry].map((g) => g ?? "None").join(", ") },
    { label: "Video", cell: (r) => (r.video ? "Yes" : dash) },
  ],
  backend: "the stones backend",
};
