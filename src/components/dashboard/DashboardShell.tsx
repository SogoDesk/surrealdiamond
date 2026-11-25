"use client";

/**
 * The Retailer Dashboard's frame (BRD 5.7, R-30), in the WB Mason customer
 * portal manner: the site header above, then a sidebar with the dealer's
 * store card (with a small Log out link) and the sections grouped (Overview,
 * Billing, Orders and memo, Your account), and the page on the right. On
 * tablets and phones the sidebar becomes the store card over a row of chips
 * that scrolls sideways.
 *
 * The dashboard is for signed-in dealers only: a visitor gets the log in and
 * Become a dealer doors in its place. The dealer session lives in this
 * browser, so until the page has hydrated it shows a quiet skeleton rather
 * than flashing the signed-out doors.
 *
 * Below it, a slim footer rather than the site's (client feedback, November
 * 2026): the header and the sidebar already lead everywhere, so only the
 * legal line, the office phone (the sidebar's contact line is hidden on
 * phones and tablets), Privacy and Terms.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import SiteChrome from "@/components/chrome/SiteChrome";
import ContactDrawer from "@/components/chrome/ContactDrawer";
import { dashGroups, dashSections } from "@/content/dashboard";
import { canSeeBilling } from "@/lib/invoices";
import { account, brand } from "@/content/site";
import { signOut, useDealer } from "@/lib/dealer";
import DashIcon from "./DashIcon";
import s from "./dashboard.module.css";

const noop = () => () => {};
export const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export const initials = (store: string) =>
  store
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export default function DashboardShell({ children }: { children: ReactNode }) {
  const dealer = useDealer();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const logOut = () => {
    signOut();
    router.push("/");
  };

  const body = !hydrated ? (
    <div className={s.skeleton} aria-busy="true" aria-label="Loading your dashboard">
      <span />
      <span />
      <span />
    </div>
  ) : !dealer ? (
    <div className={s.gate}>
      <p className={s.kicker}>Retailer Dashboard</p>
      <h1 className={s.gateTitle}>
        Everything for <em>your store</em>
      </h1>
      <p className={s.gateLine}>Invoices and payments, orders and reorder, open memo items and your account, in one place. Log in with your dealer account to open it.</p>
      <div className={s.gateDoors}>
        <Link href={`${account.login}?next=${encodeURIComponent(pathname)}`} className={s.primary}>
          Dealer log in
        </Link>
        <Link href="/contact?type=dealer" className={s.secondary}>
          Become a dealer
        </Link>
      </div>
    </div>
  ) : (
    <div className={s.frame}>
      <aside className={s.sidebar} aria-label="Dashboard" data-dashboard-sidebar>
        <div className={s.storeCard}>
          <span className={s.avatar} aria-hidden>
            {initials(dealer.store)}
          </span>
          <span className={s.storeText}>
            <strong>{dealer.store}</strong>
            <span>{dealer.email}</span>
            {/* At the top on every screen size, phones included (client task list, November 2026, item 19). */}
            <button type="button" className={s.storeLogout} onClick={logOut}>
              Log out
            </button>
          </span>
          {dealer.demo && <span className={s.demoTag}>Preview</span>}
        </div>
        <nav className={s.nav}>
          {dashGroups.map((g) => (
            <div key={g} className={s.navGroup}>
              <p className={s.navGroupTitle}>{g}</p>
              <ul>
                {dashSections
                  .filter((d) => d.group === g && (!d.billing || canSeeBilling(dealer)))
                  .map((d) => {
                    const active = d.href === "/dashboard" ? pathname === d.href : d.id === "invoices" ? pathname.startsWith("/dashboard/invoices") : pathname === d.href;
                    const inner = (
                      <>
                        <DashIcon id={d.icon} className={s.navIcon} />
                        <span>{d.label}</span>
                        {d.fresh && <span className={s.navTag}>New</span>}
                        {d.external && (
                          <svg aria-hidden viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={s.navExternal}>
                            <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
                          </svg>
                        )}
                      </>
                    );
                    return (
                      <li key={d.id}>
                        {d.external ? (
                          <a href={d.href} className={s.navLink} target="_blank" rel="noreferrer">
                            {inner}
                            <span className={s.srOnly}> (opens the custom order portal in a new tab)</span>
                          </a>
                        ) : (
                          <Link href={d.href} className={s.navLink} aria-current={active ? "page" : undefined}>
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
        <div className={s.sideFoot}>
          <p>
            Questions? <a href={brand.office.phoneHref}>{brand.office.phone}</a>
            <br />
            {brand.office.hours}
          </p>
        </div>
      </aside>
      <div className={s.content}>{children}</div>
    </div>
  );

  return (
    <>
      <SiteChrome />
      <ContactDrawer />
      <main id="main" className={s.main}>
        <div className={s.wrap}>{body}</div>
        <DashFooter />
      </main>
    </>
  );
}

function DashFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <span>
          &copy; {year} {brand.name}. All rights reserved.
        </span>
        <nav aria-label="Footer" className={s.footerLinks}>
          <a href={brand.office.phoneHref} className="tabular">
            {brand.office.phone}
          </a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
