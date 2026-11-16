"use client";

/**
 * Staff and roles (BRD section 4, R-35, B-04; client request, 16 November
 * 2026): who works in the console, which role each has, what each role may
 * open, and a log of sign ins and changes.
 *
 * - Staff: everyone on the list with role, status (active, setup link sent,
 *   disabled), last sign in and who added them. Add a staff member; change a
 *   role from the list; resend a setup link; disable, enable or remove.
 * - Roles: the five built in plus custom roles. Create a role copies an
 *   existing one's access or starts locked, then sets edit, view or none for
 *   each module; custom roles can be edited or deleted once no one has them.
 * - Access matrix: every role against every module.
 * - Activity: sign ins and changes, newest first, with a CSV.
 *
 * Only an administrator creates or edits roles and gives or takes away the
 * Administrator role; HR (edit on this module) adds people and assigns the
 * other roles; Manager views. On the live site everything goes through the
 * API (useStaffDirectory), which applies the same rules and keeps the
 * activity log; a setup link the API could not email is shown here once, to
 * pass on. In the preview it lives in this browser.
 */

import { useMemo, useState } from "react";
import { adminModules, type Access } from "@/content/admin";
import { API_AUTH } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv";
import { useStaff } from "@/lib/staff";
import { canDo, eventLabel, useRoleBook, useStaffDirectory, type RoleDef, type StaffLink, type StaffStatus, type StaffUser } from "@/lib/staffAdmin";
import { AddStaffForm, AdminDrawer, RoleForm } from "./AdminAdd";
import { useAdminAccess } from "./AdminShell";
import s from "./admin.module.css";

const ACCESS: Record<Access, string> = { edit: "Edit", view: "View", none: "None" };
const STATUS: Record<StaffStatus, string> = { active: "Active", invited: "Setup link sent", not_invited: "No link yet", disabled: "Disabled" };

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

type Drawer = { kind: "person" } | { kind: "role"; role?: RoleDef };

export default function AdminStaff() {
  const staff = useStaff();
  const access = useAdminAccess();
  const book = useRoleBook();
  const dir = useStaffDirectory();
  const { users, events } = dir;
  const [links, setLinks] = useState<StaffLink[]>([]);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  const [drawer, setDrawer] = useState<Drawer>({ kind: "person" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [confirmId, setConfirmId] = useState("");
  const [logShown, setLogShown] = useState(25);

  const myRole = staff?.role ?? "";
  const by = staff ? `${staff.name ?? staff.email}, ${book.label(myRole)}` : "";
  const may = canDo(myRole, access);
  const me = (u: StaffUser) => Boolean(staff?.email) && u.email.toLowerCase() === staff?.email?.toLowerCase();

  const open = (d: Drawer) => {
    setDrawerKey((k) => k + 1);
    setDrawer(d);
    setDrawerOpen(true);
  };
  const close = () => setDrawerOpen(false);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      const out = await fn();
      if (out && typeof out === "object" && "url" in out) setLinks((l) => [out as StaffLink, ...l.filter((x) => x.email !== (out as StaffLink).email)]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That change could not be made.");
    }
    setBusy("");
    setConfirmId("");
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter === "all" || u.role === roleFilter) && (statusFilter === "all" || u.status === statusFilter) && (!term || [u.name, u.email].join(" ").toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, q, roleFilter, statusFilter]);

  const shownEvents = events;
  const roles = dir.roles;
  const roleOf = (id: string) => roles.find((r) => r.id === id);
  const labelOf = (id: string) => roleOf(id)?.label ?? book.label(id);
  const holders = (id: string) => roleOf(id)?.people ?? users.filter((u) => u.role === id).length;
  const count = (st: StaffStatus) => users.filter((u) => u.status === st).length;

  return (
    <div className={s.page}>
      <header className={s.pageHead}>
        <div>
          <p className={s.kicker}>Staff and roles</p>
          <h1 className={s.pageTitle}>Who can do what</h1>
          <p className={s.pageLine}>
            Every person has one role, and each role opens each module to edit, to view, or not at all. Dealers and their associates sign in to the storefront, not the console.
          </p>
        </div>
        <span className={s.cardTools}>
          {may.manageRoles && (
            <button type="button" className={s.secondaryBtn} onClick={() => open({ kind: "role" })}>
              Create a role
            </button>
          )}
          {may.addPeople && (
            <button type="button" className={s.primary} onClick={() => open({ kind: "person" })}>
              Add a staff member
            </button>
          )}
        </span>
      </header>

      {!API_AUTH && <p className={s.note}>Preview: the list starts with the five test accounts and keeps every change in this browser. Sign in as anyone on it from Signed in as at the top.</p>}

      {(error || dir.error) && (
        <p className={s.error} role="alert">
          {error || dir.error}
        </p>
      )}

      {links.length > 0 && (
        <section className={s.linkBox} aria-labelledby="links-title" role="status">
          <div className={s.cardHead}>
            <div>
              <h2 id="links-title" className={s.cardTitle}>
                {links.length === 1 ? "Setup link to pass on" : `${links.length} setup links to pass on`}
              </h2>
              <p className={s.muted}>Email is not set up yet, so send these yourself, privately. Each works once; a new link stops the old one. They are not shown again after you leave this page.</p>
            </div>
            <button type="button" className={s.textBtn} onClick={() => setLinks([])}>
              Close
            </button>
          </div>
          <ul className={s.linkList}>
            {links.map((l) => (
              <li key={l.email}>
                <span>
                  <strong>{l.name}</strong>
                  <span className={s.muted}>
                    {l.email}, works until {when(l.expiresAt)}
                  </span>
                </span>
                <button
                  type="button"
                  className={s.textBtn}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(l.url);
                      setCopied(l.email);
                    } catch {
                      setCopied("");
                    }
                  }}
                >
                  {copied === l.email ? "Copied" : "Copy link"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className={`${s.stats} ${s.statsFour}`}>
        {(
          [
            ["People", users.length, `${count("active")} active`],
            ["Setup link sent", count("invited"), "Not signed in yet"],
            ["Disabled", count("disabled"), "Cannot sign in"],
            ["Roles", roles.length, `${roles.filter((r) => !r.builtIn).length} custom`],
          ] as const
        ).map(([label, value, line]) => (
          <div key={label} className={s.stat}>
            <dt>{label}</dt>
            <dd>{value}</dd>
            <span>{line}</span>
          </div>
        ))}
      </dl>

      <section className={s.card} aria-labelledby="users-title">
        <div className={s.cardHead}>
          <h2 id="users-title" className={s.cardTitle}>
            Staff
          </h2>
          {may.addPeople && (
            <button type="button" className={s.textBtn} onClick={() => open({ kind: "person" })}>
              Add a staff member
            </button>
          )}
        </div>
        <div className={s.toolbar}>
          <label className={s.search}>
            <span className={s.srOnly}>Search staff</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" />
          </label>
          <select className={s.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
            <option value="all">Every role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select className={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StaffStatus | "all")} aria-label="Status">
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="invited">Setup link sent</option>
            <option value="not_invited">No link yet</option>
            <option value="disabled">Disabled</option>
          </select>
          <span className={s.count}>{dir.loading ? "Loading" : `${list.length} people`}</span>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign in</th>
                <th scope="col">Added</th>
                <th scope="col">
                  <span className={s.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className={s.notesCell}>
                    {dir.loading ? "Loading the staff list." : users.length ? "No one matches." : "No one on the list."}
                  </td>
                </tr>
              )}
              {list.map((u) => {
                const self = me(u);
                const editable = may.changePerson(u) && !self;
                return (
                  <tr key={u.id}>
                    <th scope="row">
                      <span className={s.personCell}>
                        <strong>
                          {u.name}
                          {self && <span className={s.youChip}>You</span>}
                        </strong>
                        <span className={s.muted}>{u.email}</span>
                        {(u.twoFactor || (u.openSessions ?? 0) > 0) && (
                          <span className={s.muted}>
                            {[u.twoFactor ? "Two factor on" : "", (u.openSessions ?? 0) > 0 ? `${u.openSessions} open ${u.openSessions === 1 ? "session" : "sessions"}` : ""].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </span>
                    </th>
                    <td>
                      {editable ? (
                        <select className={s.selectSm} value={u.role} aria-label={`Role for ${u.name}`} disabled={busy === u.id} onChange={(e) => run(u.id, () => dir.setRole(u, e.target.value, by))}>
                          {roles
                            .filter((r) => r.id === u.role || may.giveRole(r.id))
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <>
                          {labelOf(u.role)}
                          {roleOf(u.role) && !roleOf(u.role)?.builtIn && <span className={s.customTag}>Custom</span>}
                        </>
                      )}
                    </td>
                    <td>
                      <span className={s.statusChip} data-status={u.status}>
                        {STATUS[u.status]}
                      </span>
                    </td>
                    <td className="tabular">{when(u.lastSignInAt) || "Never"}</td>
                    <td>
                      <span className={s.personCell}>
                        <span>{new Date(u.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        {u.addedBy && <span className={s.muted}>{u.addedBy}</span>}
                      </span>
                    </td>
                    <td>
                      {editable && (
                        <span className={s.cardTools}>
                          {u.status !== "disabled" && (
                            <button type="button" className={s.textBtn} disabled={busy === u.id} onClick={() => run(u.id, () => dir.resend(u, by))}>
                              {u.status === "active" ? "Send reset link" : "Send setup link"}
                            </button>
                          )}
                          <button type="button" className={s.textBtn} disabled={busy === u.id} onClick={() => run(u.id, () => dir.setStatus(u, u.status === "disabled" ? "active" : "disabled", by))}>
                            {u.status === "disabled" ? "Enable" : "Disable"}
                          </button>
                          {confirmId === u.id ? (
                            <button type="button" className={s.textBtn} disabled={busy === u.id} onClick={() => run(u.id, () => dir.remove(u, by))}>
                              <span className={s.warnText}>Confirm remove</span>
                            </button>
                          ) : (
                            <button type="button" className={s.textBtn} onClick={() => setConfirmId(u.id)}>
                              Remove
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!may.manageRoles && may.addPeople && <p className={s.muted}>Only an administrator can make someone an administrator or change an administrator.</p>}
      </section>

      <section className={s.card} aria-labelledby="roles-title">
        <div className={s.cardHead}>
          <div>
            <h2 id="roles-title" className={s.cardTitle}>
              Roles
            </h2>
            <p className={s.muted}>The five built in roles are Surreal&apos;s proposed set (C-05). Custom roles add to them.</p>
          </div>
          {may.manageRoles && (
            <button type="button" className={s.textBtn} onClick={() => open({ kind: "role" })}>
              Create a role
            </button>
          )}
        </div>
        <ul className={s.roles}>
          {roles.map((r) => (
            <li key={r.id} className={s.roleCard} data-current={myRole === r.id ? "" : undefined}>
              <strong>
                {r.label}
                {!r.builtIn && <span className={s.customTag}>Custom</span>}
              </strong>
              <span>{r.line}</span>
              <span className={s.muted}>
                {holders(r.id)} {holders(r.id) === 1 ? "person" : "people"}
              </span>
              {myRole === r.id && <span className={s.countChip}>You</span>}
              {!r.builtIn && may.manageRoles && (
                <span className={s.cardTools}>
                  <button type="button" className={s.textBtn} onClick={() => open({ kind: "role", role: r })}>
                    Edit
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={s.card} aria-labelledby="matrix-title">
        <div className={s.cardHead}>
          <div>
            <h2 id="matrix-title" className={s.cardTitle}>
              Access matrix
            </h2>
            <p className={s.muted}>Built in roles: proposed, Surreal confirms them with the role to page breakdown. The server enforces the built in roles.</p>
          </div>
        </div>
        <div className={s.tableWrap}>
          <table className={`${s.table} ${s.matrix}`}>
            <thead>
              <tr>
                <th scope="col">Module</th>
                {roles.map((r) => (
                  <th key={r.id} scope="col">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adminModules.map((m) => (
                <tr key={m.id}>
                  <th scope="row">
                    <strong>{m.label}</strong>
                    <span className={s.muted}>{m.line}</span>
                  </th>
                  {roles.map((r) => {
                    const a: Access = m.id === "overview" ? "view" : (r.access[m.id] ?? "none");
                    return (
                      <td key={r.id}>
                        <span className={s.accessChip} data-access={a}>
                          {ACCESS[a]}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.card} aria-labelledby="activity-title">
        <div className={s.cardHead}>
          <div>
            <h2 id="activity-title" className={s.cardTitle}>
              Activity
            </h2>
            <p className={s.muted}>{API_AUTH ? "Staff sign ins, failed sign ins and every change, newest first." : "Sign ins and changes in this browser, newest first."}</p>
          </div>
          {events.length > 0 && (
            <button
              type="button"
              className={s.textBtn}
              onClick={() => downloadCsv("surreal staff activity.csv", [["When", "Who", "What", "About", "Detail"], ...shownEvents.map((e) => [e.at, e.by, eventLabel(e.kind), e.subject, e.detail])])}
            >
              Download CSV
            </button>
          )}
        </div>
        <div className={s.checkSummary} role="radiogroup" aria-label="Show">
          {(
            [
              ["all", "Everything"],
              ["signins", "Sign ins"],
              ["changes", "Changes"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={dir.show === k} className={s.segBtn} onClick={() => dir.setShow(k)}>
              {label}
            </button>
          ))}
        </div>
        {shownEvents.length === 0 ? (
          <p className={s.emptyRow}>Nothing yet.</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">What</th>
                  <th scope="col">About</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {shownEvents.slice(0, logShown).map((e) => (
                  <tr key={e.id}>
                    <td className="tabular">{when(e.at)}</td>
                    <td>{e.by}</td>
                    <td className={e.kind === "signin_failed" ? s.warnText : undefined}>{eventLabel(e.kind)}</td>
                    <td>{e.subject}</td>
                    <td className={s.notesCell}>{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(shownEvents.length > logShown || dir.hasMore) && (
          <button
            type="button"
            className={s.more}
            onClick={() => {
              setLogShown((n) => n + 25);
              if (shownEvents.length <= logShown + 25 && dir.hasMore) dir.loadMore();
            }}
          >
            Show 25 more
          </button>
        )}
      </section>

      {staff && (
        <AdminDrawer
          open={drawerOpen}
          onClose={close}
          kicker="Staff and roles"
          title={drawer.kind === "role" ? (drawer.role ? `Edit ${drawer.role.label}` : "Create a role") : "Add a staff member"}
          line={drawer.kind === "role" ? "A name, and what it may open." : "Their name, work email and one role. They set their own password."}
        >
          {drawer.kind === "role" ? (
            <RoleForm key={drawerKey} role={drawer.role} dir={dir} by={by} onClose={close} />
          ) : (
            <AddStaffForm key={drawerKey} dir={dir} by={by} myRole={myRole} onClose={close} onLink={(l) => setLinks((all) => [l, ...all.filter((x) => x.email !== l.email)])} />
          )}
        </AdminDrawer>
      )}
    </div>
  );
}
