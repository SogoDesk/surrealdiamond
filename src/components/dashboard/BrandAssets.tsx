"use client";

/**
 * Brand assets (client task list, November 2026, item 21; from Surreal's
 * "Digital Marketing Programs" dashboard page): previews of the brand assets
 * this site holds, each opening larger in the asset viewer with Download, and
 * Surreal's shared folders for the full libraries.
 *
 * 1. Social media posts, with the monthly library on Dropbox and posting on
 *    autopilot through the JewelPost Network.
 * 2. Web banners for a store's own site.
 * 3. The logo: Surreal's artwork on white, and the line mark as SVG.
 * 4. Product images: renders on white; each one opens Surreal's product
 *    image folder, linked exactly as shared.
 * 5. Video: the turntable films, playing on hover.
 */

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useM2OMotion } from "@/components/diamonds/useM2OMotion";
import { renderSrc } from "@/content/catalog";
import { stories } from "@/content/home";
import { BRAND_LIBRARIES, JEWELPOST, LOGO_FILES, PRODUCT_PREVIEWS, SOCIAL_POSTS, WEB_BANNERS } from "@/content/programs";
import AssetViewer, { downloadAsset, type ViewerAsset } from "./AssetViewer";
import ExtIcon from "./ExtIcon";
import p from "./pages.module.css";
import x from "./programs.module.css";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SETS = {
  social: SOCIAL_POSTS.map<ViewerAsset>((a, i) => ({ src: a.src, title: a.title, kind: "image", file: `surreal-social-${i + 1}.jpg`, meta: `JPG, ${a.w} × ${a.h}`, w: a.w, h: a.h })),
  banners: WEB_BANNERS.map<ViewerAsset>((a, i) => ({ src: a.src, title: a.title, kind: "image", file: `surreal-web-banner-${i + 1}.jpg`, meta: `JPG, ${a.w} × ${a.h}`, w: a.w, h: a.h })),
  logos: LOGO_FILES.map<ViewerAsset>((l) => ({ src: l.src, title: l.title, kind: "image", file: l.file, meta: l.format === "SVG" ? "SVG, sharp at any size" : `${l.format}, ${l.w} × ${l.h}`, w: l.w, h: l.h, ground: l.ground })),
  videos: stories.map<ViewerAsset>((s) => ({ src: `/media/video/${s.id}.mp4`, poster: `/media/video/${s.id}.webp`, title: s.title, kind: "video", file: `surreal-${slug(s.title)}-turntable.mp4`, meta: "MP4 turntable, silent loop", ground: "white" })),
};
type SetId = keyof typeof SETS;

const JUMPS: { id: string; label: string }[] = [
  { id: "ba-social", label: "Social media" },
  { id: "ba-banners", label: "Web banners" },
  { id: "ba-logo", label: "Logo" },
  { id: "ba-products", label: "Product images" },
  { id: "ba-video", label: "Video" },
];

function Section({ id, title, line, action, children }: { id: string; title: string; line: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={x.section} aria-labelledby={`${id}-title`}>
      <div className={x.sectionHead} data-rise>
        <div>
          <h2 id={`${id}-title`} className={x.sectionTitle}>
            {title}
          </h2>
          <p className={x.sectionLine}>{line}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LibraryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={x.headAction}>
      {children}
      <ExtIcon />
    </a>
  );
}

function VideoTile({ asset, onOpen }: { asset: ViewerAsset; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const play = () => void ref.current?.play().catch(() => undefined);
  const stop = () => ref.current?.pause();
  return (
    <button type="button" className={x.videoTile} onClick={onOpen} onMouseEnter={play} onMouseLeave={stop} onFocus={play} onBlur={stop} aria-label={`Play ${asset.title}`}>
      <span className={x.videoFrame}>
        <video ref={ref} src={asset.src} poster={asset.poster} muted loop playsInline preload="none" tabIndex={-1} />
        <span className={x.playBadge} aria-hidden>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M5 3.5v9l7.5-4.5Z" />
          </svg>
        </span>
      </span>
      <span className={x.tileCaption}>
        <strong>{asset.title}</strong>
        <span>Turntable video</span>
      </span>
    </button>
  );
}

export default function BrandAssets() {
  const ref = useRef<HTMLDivElement>(null);
  useM2OMotion(ref);
  const [view, setView] = useState<{ set: SetId; i: number } | null>(null);
  const show = (set: SetId, i: number) => setView({ set, i });

  return (
    <div ref={ref} className={`${p.page} ${x.programPage}`}>
      <nav aria-label="Breadcrumb" className={p.crumbs}>
        <Link href="/dashboard">Dashboard</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">Brand assets</span>
      </nav>
      <header className={x.pageHead}>
        <p className={p.kicker}>Digital marketing</p>
        <h1 className={p.title}>
          Brand <em>assets</em>
        </h1>
        <p className={p.lead}>
          Our job is not only the diamonds and jewellery your customers love. It is also the marketing that helps you lead the lab grown category in your market. Preview what is here, download what you need, and open the full libraries for more.
        </p>
        <nav className={x.jump} aria-label="On this page">
          {JUMPS.map((j) => (
            <a key={j.id} href={`#${j.id}`}>
              {j.label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="ba-social" title="Social media" line="Posts ready for your feed. The full campaign library is updated monthly." action={<LibraryLink href={BRAND_LIBRARIES.social}>Open the social library</LibraryLink>}>
        <ul className={x.grid4}>
          {SETS.social.map((a, i) => (
            <li key={a.src} data-rise>
              <button type="button" className={x.tile} onClick={() => show("social", i)} aria-label={`View ${a.title}`}>
                <Image src={a.src} alt="" fill sizes="(min-width: 1200px) 17vw, (min-width: 768px) 28vw, 46vw" className={x.tileImg} />
                <span className={x.tileHover} aria-hidden>
                  View
                </span>
              </button>
            </li>
          ))}
          <li data-rise>
            <a href={BRAND_LIBRARIES.social} target="_blank" rel="noreferrer" className={x.libraryTile} data-palette="brand">
              <span className={x.libraryKicker}>Updated monthly</span>
              <span className={x.libraryTitle}>More posts in the full library</span>
              <span className={x.libraryGo}>
                Open in Dropbox <ExtIcon />
              </span>
            </a>
          </li>
        </ul>
        <div className={x.autopilot} data-rise>
          <span className={x.autopilotIcon} aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" />
            </svg>
          </span>
          <p>
            <strong>Post on autopilot.</strong> The {JEWELPOST.network} can post our social content for you, so you do not have to do a thing. Questions? Contact {JEWELPOST.contact} at our agency partner {JEWELPOST.agency},{" "}
            <a href={`mailto:${JEWELPOST.email}`}>{JEWELPOST.email}</a>.
          </p>
        </div>
      </Section>

      <Section id="ba-banners" title="Web banners" line="Wide banners for the home page of your own website." action={<LibraryLink href={BRAND_LIBRARIES.social}>More in the library</LibraryLink>}>
        <ul className={x.grid2}>
          {SETS.banners.map((a, i) => (
            <li key={a.src} data-rise>
              <button type="button" className={`${x.tile} ${x.tileWide}`} onClick={() => show("banners", i)} aria-label={`View ${a.title}`}>
                <Image src={a.src} alt="" fill sizes="(min-width: 1200px) 36vw, (min-width: 768px) 46vw, 92vw" className={x.tileImg} />
                <span className={x.tileHover} aria-hidden>
                  View
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="ba-logo" title="Logo" line="The Surreal logo for your store, your website and your advertising.">
        <ul className={x.grid3}>
          {SETS.logos.map((a, i) => {
            const l = LOGO_FILES[i];
            return (
              <li key={a.src} className={x.logoItem} data-rise>
                <button type="button" className={x.logoStage} data-ground={l.ground} onClick={() => show("logos", i)} aria-label={`View ${a.title}`}>
                  <Image src={a.src} alt="" width={l.w} height={l.h} unoptimized={a.src.endsWith(".svg")} className={x.logoImg} />
                </button>
                <div>
                  <p className={x.logoTitle}>
                    {l.title} <span className={x.format}>{l.format}</span>
                  </p>
                  <p className={x.logoLine}>{l.line}</p>
                  <button type="button" className={p.textBtn} onClick={() => void downloadAsset(a)}>
                    Download {l.format}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="ba-products" title="Product images" line="Pieces photographed on white, ready for your website and listings." action={<LibraryLink href={BRAND_LIBRARIES.products}>Open the product image library</LibraryLink>}>
        <ul className={x.grid4}>
          {PRODUCT_PREVIEWS.map((pr) => (
            <li key={pr.slug} data-rise>
              <a href={BRAND_LIBRARIES.products} target="_blank" rel="noreferrer" className={x.productTile}>
                <span className={x.productWell}>
                  <Image src={renderSrc(pr.slug)} alt="" fill sizes="(min-width: 1200px) 17vw, (min-width: 768px) 28vw, 46vw" className={x.productImg} />
                </span>
                <span className={x.tileCaption}>
                  <strong>{pr.title}</strong>
                  <span>
                    Open in Dropbox <ExtIcon />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="ba-video" title="Video" line="Turntable films of our engagement settings, for the screen in your store or your social posts.">
        <ul className={x.grid5}>
          {SETS.videos.map((a, i) => (
            <li key={a.src} data-rise>
              <VideoTile asset={a} onOpen={() => show("videos", i)} />
            </li>
          ))}
        </ul>
      </Section>

      <AssetViewer items={view ? SETS[view.set] : []} index={view ? view.i : null} onIndex={(i) => setView((v) => (v ? { ...v, i } : v))} onClose={() => setView(null)} />
    </div>
  );
}
