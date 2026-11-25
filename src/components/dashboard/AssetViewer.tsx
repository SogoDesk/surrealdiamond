"use client";

/**
 * A larger look at one brand asset (Brand assets page): the image or video
 * in a modal dialog, with Previous and Next (arrow keys too), Download and
 * Open full size. Escape, the close button or a click on the backdrop closes
 * it. A WebP saved under a .jpg name is converted to JPG in the browser first,
 * since stores post JPGs; SVG and MP4 files download as they are.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import x from "./programs.module.css";

export interface ViewerAsset {
  src: string;
  title: string;
  kind: "image" | "video";
  /** The name the file is saved under. */
  file: string;
  /** Shown under the title, e.g. "JPG, 1600 × 1600". */
  meta: string;
  w?: number;
  h?: number;
  poster?: string;
  ground?: "white" | "light" | "dark";
}

async function saveAsJpg(src: string, file: string) {
  const img = new window.Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("No JPG");
  saveBlob(URL.createObjectURL(blob), file, true);
}

function saveBlob(href: string, file: string, revoke = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 2000);
}

/** Downloads one asset; a WebP named .jpg is converted first. */
export async function downloadAsset(asset: Pick<ViewerAsset, "src" | "file">) {
  if (/\.jpe?g$/i.test(asset.file) && /\.webp$/i.test(asset.src)) {
    try {
      await saveAsJpg(asset.src, asset.file);
      return;
    } catch {
      /* Fall back to the file as it is. */
    }
  }
  saveBlob(asset.src, asset.file);
}

export default function AssetViewer({ items, index, onIndex, onClose }: { items: ViewerAsset[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const open = index !== null;
  const item = index !== null ? items[index] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const step = (dir: number) => {
    if (index === null || items.length < 2) return;
    onIndex((index + dir + items.length) % items.length);
  };

  const save = async () => {
    if (!item) return;
    setSaving(true);
    await downloadAsset(item);
    setSaving(false);
  };

  return (
    <dialog
      ref={ref}
      className={x.viewer}
      aria-label={item ? item.title : "Brand asset"}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      {item && (
        <div className={x.viewerInner}>
          <div className={x.viewerStage} data-ground={item.ground ?? "dark"}>
            {item.kind === "video" ? (
              <video key={item.src} src={item.src} poster={item.poster} controls autoPlay muted loop playsInline className={x.viewerMedia} />
            ) : (
              <Image
                key={item.src}
                src={item.src}
                alt={item.title}
                width={item.w ?? 1600}
                height={item.h ?? 1600}
                sizes="(min-width: 1024px) 72vw, 92vw"
                unoptimized={item.src.endsWith(".svg")}
                className={x.viewerMedia}
              />
            )}
          </div>
          <div className={x.viewerBar}>
            <div className={x.viewerText}>
              <p className={x.viewerTitle}>{item.title}</p>
              <p className={x.viewerMeta}>{item.meta}</p>
            </div>
            <div className={x.viewerDoors}>
              {items.length > 1 && (
                <span className={x.viewerSteps}>
                  <button type="button" className={x.roundBtn} onClick={() => step(-1)} aria-label="Previous">
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 3 5 8l5 5" />
                    </svg>
                  </button>
                  <button type="button" className={x.roundBtn} onClick={() => step(1)} aria-label="Next">
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 3 5 5-5 5" />
                    </svg>
                  </button>
                </span>
              )}
              <a href={item.src} target="_blank" rel="noreferrer" className={x.viewerLink}>
                Open full size
              </a>
              <button type="button" className={x.viewerSave} onClick={save} disabled={saving}>
                {saving ? "Preparing" : "Download"}
              </button>
              <button type="button" className={x.roundBtn} onClick={() => ref.current?.close()} aria-label="Close">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
