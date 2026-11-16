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
 * other roles; Manager views. The list lives in this browser until the staff
 * backend (B6) serves it (lib/staffAdmin.ts). On the live site the real
 * logins are on the server, and roles change there until then (staff:role).
 */

import { useMemo, useState } from "react";
import { adminModules, type Access } from "@/content/admin";
import { API_AUTH } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv";
import { useStaff } from "@/lib/staff";
import {
  EVENT_LABEL,
  canDo,
  removeStaffUser,
  resendStaffLink,
  setStaffRole,
  setStaffStatus,
  useRoleBook,
  useStaffAdmin,
  type RoleDef,
  type StaffStatus,
  type StaffUser,
} from "@/lib/staffAdmin";
import { AddStaffForm, AdminDrawer, RoleForm } from "./AdminAdd";
import { useAdminAccess } from "./AdminShell";
import s from "./admin.module.css";

const ACCESS: Record<Access, string> = { edit: "Edit", view: "View", none: "None" };
const STATUS: Record<StaffStatus, string> = { active: "Active", invited: "Setup link sent", disabled: "Disabled" };
const SIGNINS = new Set(["signin"]);

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

type Drawer = { kind: "person" } | { kind: "role"; role?: RoleDef };

export default function AdminStaff() {
  const staff = useStaff();
  const access = useAdminAccess();
  const book = useRoleBook();
  const { users, events } = useStaffAdmin();
  const [drawer, setDrawer] = useState<Drawer>({ kind: "person" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [confirmId, setConfirmId] = useState("");
  const [log, setLog] = useState<"all" | "signins" | "changes">("all");
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
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That change could not be made.");
    }
    setConfirmId("");
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter === "all" || u.role === roleFilter) && (statusFilter === "all" || u.status === statusFilter) && (!term || [u.name, u.email].join(" ").toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, q, roleFilter, statusFilter]);

  const shownEvents = events.filter((e) => log === "all" || (log === "signins" ? SIGNINS.has(e.kind) : !SIGNINS.has(e.kind)));
  const holders = (id: string) => users.filter((u) => u.role === id).length;
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

      <p className={API_AUTH ? s.warnNote : s.note}>
        {API_AUTH
          ? "The staff list, roles and activity here are kept in this browser until the staff backend is connected. People added here cannot sign in yet, and custom roles apply once the server knows them. Real logins and their roles are on the server today."
          : "Preview: the list starts with the five test accounts and keeps every change in this browser. Sign in as anyone on it from Signed in as at the top."}
      </p>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <dl className={`${s.stats} ${s.statsFour}`}>
        {(
          [
            ["People", users.length, `${count("active")} active`],
            ["Setup link sent", count("invited"), "Not signed in yet"],
            ["Disabled", count("disabled"), "Cannot sign in"],
            ["Roles", book.list.length, `${book.list.filter((r) => !r.builtIn).length} custom`],
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
            {book.list.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select className={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StaffStatus | "all")} aria-label="Status">
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="invited">Setup link sent</option>
            <option value="disabled">Disabled</option>
          </select>
          <span className={s.count}>{list.length} people</span>
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
                    {users.length ? "No one matches." : API_AUTH ? "No one added in this browser yet. The live logins are on the server until the staff backend lists them here." : "No one on the list."}
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
                      </span>
                    </th>
                    <td>
                      {editable ? (
                        <select className={s.selectSm} value={u.role} aria-label={`Role for ${u.name}`} onChange={(e) => run(() => setStaffRole(u.id, e.target.value, by))}>
                          {book.list
                            .filter((r) => r.id === u.role || may.giveRole(r.id))
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <>
                          {book.label(u.role)}
                          {!book.list.find((r) => r.id === u.role)?.builtIn && <span className={s.customTag}>Custom</span>}
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
                        <span className={s.muted}>{u.addedBy}</span>
                      </span>
                    </td>
                    <td>
                      {editable && (
                        <span className={s.cardTools}>
                          {u.status === "invited" && (
                            <button type="button" className={s.textBtn} onClick={() => run(() => resendStaffLink(u.id, by))}>
                              Resend link
                            </button>
                          )}
                          <button type="button" className={s.textBtn} onClick={() => run(() => setStaffStatus(u.id, u.status === "disabled" ? "active" : "disabled", by))}>
                            {u.status === "disabled" ? "Enable" : "Disable"}
                          </button>
                          {confirmId === u.id ? (
                            <button type="button" className={s.textBtn} onClick={() => run(() => removeStaffUser(u.id, by))}>
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
          {book.list.map((r) => (
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
                {book.list.map((r) => (
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
                  {book.list.map((r) => {
                    const a = book.access(r.id, m.id);
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
            <p className={s.muted}>{API_AUTH ? "Changes made in this browser. Sign ins on the live site are recorded by the server and show here once the staff backend is connected." : "Sign ins and changes in this browser, newest first."}</p>
          </div>
          {events.length > 0 && (
            <button
              type="button"
              className={s.textBtn}
              onClick={() => downloadCsv("surreal staff activity.csv", [["When", "Who", "What", "About", "Detail"], ...shownEvents.map((e) => [e.at, e.by, EVENT_LABEL[e.kind], e.subject, e.detail])])}
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
            <button key={k} type="button" role="radio" aria-checked={log === k} className={s.segBtn} onClick={() => setLog(k)}>
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
                    <td>{EVENT_LABEL[e.kind]}</td>
                    <td>{e.subject}</td>
                    <td className={s.notesCell}>{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shownEvents.length > logShown && (
          <button type="button" className={s.more} onClick={() => setLogShown((n) => n + 25)}>
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
          {drawer.kind === "role" ? <RoleForm key={drawerKey} role={drawer.role} by={by} onClose={close} /> : <AddStaffForm key={drawerKey} by={by} myRole={myRole} onClose={close} />}
        </AdminDrawer>
      )}
    </div>
  );
}
