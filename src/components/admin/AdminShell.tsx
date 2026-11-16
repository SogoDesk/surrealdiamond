"use client";

/**
 * The admin console's frame (BRD 5.8), for Surreal staff at /admin. Its own
 * chrome, apart from the storefront: an ink sidebar with the SURREAL
 * wordmark and the modules (each locked or open for the signed-in role, from
 * the access matrix in src/content/admin.ts), and a top bar with the page's
 * breadcrumb, the role switcher, View the site and Sign out.
 *
 * On the live site staff sign in with their own login (StaffGate). In the
 * preview they enter as anyone on the staff list (lib/staffAdmin.ts: the
 * test accounts, one per role, plus people added under Staff and roles),
 * so a custom role can be tried too. Access comes from the role book: the
 * built in matrix and any custom roles. A module the role cannot open shows
 * a locked panel; a view-only role sees the page with its controls
 * disabled, through useAdminAccess().
 */

import Link from "next/link";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { adminModule, adminModules, type Access } from "@/content/admin";
import { API_AUTH } from "@/lib/api/client";
import { signInStaff, signOutStaff, useStaff } from "@/lib/staff";
import { useRoleBook, useStaffAdmin } from "@/lib/staffAdmin";
import AdminIcon from "./AdminIcon";
import StaffGate, { StaffPassword, StaffTwoFactor } from "./StaffGate";
import s from "./admin.module.css";

const AccessContext = createContext<Access>("none");
/** The signed-in role's access to the current module: "edit", "view" or "none". */
export const useAdminAccess = () => useContext(AccessContext);

const noop = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export default function AdminShell({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  const staff = useStaff();
  const hydrated = useHydrated();
  const [panel, setPanel] = useState<"password" | "twoFactor" | null>(null);
  const mod = adminModule(moduleId);
  const book = useRoleBook();
  const people = useStaffAdmin().users.filter((u) => u.status !== "disabled" && book.exists(u.role));

  if (!hydrated) return <div className={s.boot} aria-busy="true" aria-label="Loading the console" data-console />;

  if (!staff && API_AUTH) return <StaffGate />;

  if (!staff) {
    return (
      <main className={s.signin} data-console>
        <div className={s.signinCard}>
          <p className={s.wordmark}>
            SURREAL <span>Console</span>
          </p>
          <h1 className={s.signinTitle}>Staff sign in</h1>
          <p className={s.signinLine}>Choose someone on the staff list to preview the console. Each has one role and sees the modules its access allows.</p>
          <ul className={s.roleList}>
            {people.map((t) => (
              <li key={t.email}>
                <button type="button" className={s.roleBtn} onClick={() => signInStaff(t.role, t)}>
                  <strong>
                    {t.name} <em>{book.label(t.role)}</em>
                  </strong>
                  <span>{book.line(t.role)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={s.signinNote}>Preview: dummy accounts for role testing (docs/TESTING.md), plus anyone added under Staff and roles. On the live site every person signs in with their own login.</p>
          <Link href="/" className={s.backLink}>
            Back to the site
          </Link>
        </div>
      </main>
    );
  }

  const access: Access = mod ? book.access(staff.role, mod.id) : "none";
  const roleName = book.label(staff.role);

  return (
    <div className={s.console} data-console>
      <aside className={s.sidebar} aria-label="Console">
        <Link href="/admin" className={s.brand}>
          SURREAL <span>Console</span>
        </Link>
        <nav>
          <ul className={s.nav}>
            {adminModules.map((m) => {
              const a = book.access(staff.role, m.id);
              return (
                <li key={m.id}>
                  <Link href={m.href} className={s.navLink} aria-current={m.id === moduleId ? "page" : undefined} data-locked={a === "none" ? "" : undefined}>
                    <AdminIcon id={m.icon} className={s.navIcon} />
                    <span>{m.label}</span>
                    {a === "none" ? (
                      <svg className={s.lock} viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1" aria-label="No access">
                        <rect x="2.5" y="6" width="9" height="6.5" rx="1" />
                        <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
                      </svg>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className={s.sideNote}>Preview console. Changes are kept in this browser until the database is connected.</p>
      </aside>

      <div className={s.body}>
        <header className={s.topbar}>
          <p className={s.crumb}>
            <Link href="/admin">Console</Link>
            {mod && mod.id !== "overview" && (
              <>
                <span aria-hidden>/</span>
                <span aria-current="page">{mod.label}</span>
              </>
            )}
          </p>
          <div className={s.topTools}>
            {API_AUTH ? (
              <span className={s.roleSwitch}>
                Signed in as {staff.name ?? staff.email}, {roleName}
              </span>
            ) : (
            <label className={s.roleSwitch}>
              <span>Signed in as</span>
              <select
                value={people.find((t) => t.email === staff.email)?.email ?? ""}
                onChange={(e) => {
                  const t = people.find((x) => x.email === e.target.value);
                  if (t) signInStaff(t.role, t);
                }}
              >
                {!people.some((t) => t.email === staff.email) && <option value="">{staff.name ?? staff.email}, {roleName}</option>}
                {people.map((t) => (
                  <option key={t.email} value={t.email}>
                    {t.name}, {book.label(t.role)}
                  </option>
                ))}
              </select>
            </label>
            )}
            {API_AUTH && (
              <>
                <button type="button" className={s.topLink} onClick={() => setPanel((open) => (open === "twoFactor" ? null : "twoFactor"))} aria-expanded={panel === "twoFactor"}>
                  Two-factor
                </button>
                <button type="button" className={s.topLink} onClick={() => setPanel((open) => (open === "password" ? null : "password"))} aria-expanded={panel === "password"}>
                  Change password
                </button>
              </>
            )}
            <Link href="/" className={s.topLink} target="_blank" rel="noreferrer">
              View the site
            </Link>
            <button type="button" className={s.topLink} onClick={() => void signOutStaff()}>
              Sign out
            </button>
          </div>
        </header>

        <main id="main" className={s.main}>
          {API_AUTH && panel === "password" && <StaffPassword email={staff.email ?? ""} onClose={() => setPanel(null)} />}
          {API_AUTH && panel === "twoFactor" && <StaffTwoFactor onClose={() => setPanel(null)} />}
          {access === "none" ? (
            <div className={s.locked}>
              <span className={s.lockedIcon} aria-hidden>
                <svg viewBox="0 0 14 14" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="0.9">
                  <rect x="2.5" y="6" width="9" height="6.5" rx="1" />
                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
                </svg>
              </span>
              <h1 className={s.pageTitle}>{mod?.label ?? "This page"} is not open to {roleName}</h1>
              <p className={s.pageLine}>The access matrix decides which roles see each module. {API_AUTH ? "See who has access under Staff and roles." : "Switch role above, or see who has access under Staff and roles."}</p>
            </div>
          ) : (
            <AccessContext.Provider value={access}>
              {access === "view" && moduleId !== "overview" && <p className={s.viewOnly}>View only for {roleName}. Editing is off.</p>}
              {children}
            </AccessContext.Provider>
          )}
        </main>
      </div>
    </div>
  );
}
