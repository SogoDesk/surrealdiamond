"use client";

/**
 * Staff administration in the console (client request, 16 November 2026):
 * the staff list, roles beyond the five built in, and a log of who signed in
 * and who changed what.
 *
 * - Roles: the five built in (src/content/admin.ts, also enforced by the API)
 *   plus custom roles an administrator creates, each with its own access to
 *   every module. useRoleBook() answers a role's name, line and access for
 *   the console's locks.
 * - Staff: name, email, role, status (active, setup link sent, disabled),
 *   who added them and when they last signed in.
 * - Activity: sign ins and every change, newest first, kept to 500 entries.
 *
 * Who may do what (canDo): only an administrator creates, edits or deletes
 * roles and gives or takes away the Administrator role; anyone with edit on
 * Staff and roles (Administrator, HR, or a custom role with it) adds people,
 * assigns the other roles and disables or removes people. No one disables or
 * removes themselves, and the last active administrator stays.
 *
 * Kept in this browser like the rest of the console until the staff backend
 * (B6) serves it. In the preview the list starts with the five test accounts;
 * on the live site it starts empty, because real staff come from the server.
 */

import { useMemo } from "react";
import { ROLES, ROLE_LABEL, ROLE_LINE, adminModules, type Access } from "@/content/admin";
import { TEST_STAFF } from "@/content/testAccounts";
import { API_AUTH } from "./api/client";
import { createLocalStore } from "./localStore";

export interface CustomRole {
  id: string;
  label: string;
  line: string;
  /** Access per module id; Overview is always view. */
  access: Record<string, Access>;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export type StaffStatus = "active" | "invited" | "disabled";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: StaffStatus;
  addedAt: string;
  addedBy: string;
  lastSignInAt?: string;
  /** One of the preview's test accounts. */
  test?: boolean;
}

export type StaffEventKind = "signin" | "added" | "role" | "disabled" | "enabled" | "removed" | "link" | "role-created" | "role-edited" | "role-deleted";

export interface StaffEvent {
  id: string;
  at: string;
  /** Who did it, "Name, Role"; for a sign in, the person. */
  by: string;
  kind: StaffEventKind;
  /** Who or what it was about: a person's email or a role's name. */
  subject: string;
  detail: string;
}

interface StaffAdmin {
  users: StaffUser[];
  roles: CustomRole[];
  events: StaffEvent[];
}

const FALLBACK: StaffAdmin = {
  users: API_AUTH ? [] : TEST_STAFF.map((t) => ({ id: `test-${t.role}`, name: t.name, email: t.email, role: t.role, status: "active", addedAt: "2026-11-01T09:00:00.000Z", addedBy: "Preview", test: true })),
  roles: [],
  events: [],
};

const isAdmin = (v: unknown): v is StaffAdmin => typeof v === "object" && v !== null && ["users", "roles", "events"].every((k) => Array.isArray((v as Record<string, unknown>)[k]));
const store = createLocalStore<StaffAdmin>(API_AUTH ? "surreal-staff-admin" : "surreal-staff-admin-preview", FALLBACK, isAdmin);

export const useStaffAdmin = store.useStore;

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const norm = (email: string) => email.trim().toLowerCase();

function logged(a: StaffAdmin, e: Omit<StaffEvent, "id" | "at">): StaffAdmin {
  return { ...a, events: [{ id: newId("ev"), at: now(), ...e }, ...a.events].slice(0, 500) };
}

/* Roles */

export interface RoleDef {
  id: string;
  label: string;
  line: string;
  builtIn: boolean;
  access: Record<string, Access>;
}

export const BUILT_IN_ROLES: RoleDef[] = ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r], line: ROLE_LINE[r], builtIn: true, access: Object.fromEntries(adminModules.map((m) => [m.id, m.access[r]])) }));
export const isBuiltInRole = (id: string) => (ROLES as readonly string[]).includes(id);
const labelOf = (a: StaffAdmin, id: string) => BUILT_IN_ROLES.find((r) => r.id === id)?.label ?? a.roles.find((r) => r.id === id)?.label ?? "Unknown role";

export function useRoleBook() {
  const { roles } = useStaffAdmin();
  return useMemo(() => {
    const list: RoleDef[] = [...BUILT_IN_ROLES, ...roles.map((r) => ({ id: r.id, label: r.label, line: r.line, builtIn: false, access: r.access }))];
    const by = new Map(list.map((r) => [r.id, r]));
    return {
      list,
      label: (id: string) => by.get(id)?.label ?? "Unknown role",
      line: (id: string) => by.get(id)?.line ?? "",
      access: (id: string, moduleId: string): Access => (moduleId === "overview" && by.has(id) ? "view" : (by.get(id)?.access[moduleId] ?? "none")),
      exists: (id: string) => by.has(id),
    };
  }, [roles]);
}

/** Creates a role, or saves one already there. Names are unique, ignoring case. */
export function saveRole(input: { id?: string; label: string; line: string; access: Record<string, Access> }, by: string): CustomRole {
  const label = input.label.trim().replace(/\s+/g, " ");
  const a = store.get();
  const clash = [...BUILT_IN_ROLES.map((r) => ({ id: r.id, label: r.label })), ...a.roles].find((r) => r.label.toLowerCase() === label.toLowerCase() && r.id !== input.id);
  if (clash) throw new Error(`There is already a role called ${clash.label}.`);
  const access: Record<string, Access> = { ...input.access, overview: "view" };
  const existing = input.id ? a.roles.find((r) => r.id === input.id) : undefined;
  const role: CustomRole = existing ? { ...existing, label, line: input.line.trim(), access, updatedAt: now() } : { id: newId("role"), label, line: input.line.trim(), access, createdAt: now(), createdBy: by };
  const roles = existing ? a.roles.map((r) => (r.id === role.id ? role : r)) : [...a.roles, role];
  const opened = adminModules.filter((m) => m.id !== "overview" && access[m.id] !== "none").map((m) => `${m.label} ${access[m.id]}`);
  store.set(logged({ ...a, roles }, { by, kind: existing ? "role-edited" : "role-created", subject: label, detail: opened.length ? opened.join(", ") : "Overview only" }));
  return role;
}

export function deleteRole(id: string, by: string) {
  const a = store.get();
  const role = a.roles.find((r) => r.id === id);
  if (!role) return;
  const holders = a.users.filter((u) => u.role === id);
  if (holders.length) throw new Error(`${holders.length === 1 ? "One person has" : `${holders.length} people have`} this role. Give them another role first.`);
  store.set(logged({ ...a, roles: a.roles.filter((r) => r.id !== id) }, { by, kind: "role-deleted", subject: role.label, detail: "" }));
}

/* Staff */

const activeAdmins = (a: StaffAdmin) => a.users.filter((u) => u.role === "administrator" && u.status !== "disabled");

export function addStaffUser(input: { name: string; email: string; role: string }, by: string): StaffUser {
  const a = store.get();
  const email = norm(input.email);
  if (a.users.some((u) => norm(u.email) === email)) throw new Error(`${email} is already on the staff list.`);
  const user: StaffUser = { id: newId("staff"), name: input.name.trim().replace(/\s+/g, " "), email, role: input.role, status: "invited", addedAt: now(), addedBy: by };
  store.set(logged({ ...a, users: [...a.users, user] }, { by, kind: "added", subject: email, detail: `${user.name}, setup link sent` }));
  return user;
}

export function setStaffRole(userId: string, role: string, by: string) {
  const a = store.get();
  const user = a.users.find((u) => u.id === userId);
  if (!user || user.role === role) return;
  if (user.role === "administrator" && activeAdmins(a).length === 1 && user.status !== "disabled") throw new Error("This is the last active administrator. Make someone else an administrator first.");
  store.set(logged({ ...a, users: a.users.map((u) => (u.id === userId ? { ...u, role } : u)) }, { by, kind: "role", subject: user.email, detail: `${labelOf(a, user.role)} to ${labelOf(a, role)}` }));
}

export function setStaffStatus(userId: string, status: "active" | "disabled", by: string) {
  const a = store.get();
  const user = a.users.find((u) => u.id === userId);
  if (!user || user.status === status) return;
  if (status === "disabled" && user.role === "administrator" && activeAdmins(a).length === 1) throw new Error("This is the last active administrator, so it stays on.");
  const next = status === "active" && !user.lastSignInAt ? "invited" : status;
  store.set(logged({ ...a, users: a.users.map((u) => (u.id === userId ? { ...u, status: next } : u)) }, { by, kind: status === "disabled" ? "disabled" : "enabled", subject: user.email, detail: status === "disabled" ? "Signed out and blocked from signing in" : "Can sign in again" }));
}

export function resendStaffLink(userId: string, by: string) {
  const a = store.get();
  const user = a.users.find((u) => u.id === userId);
  if (!user) return;
  store.set(logged(a, { by, kind: "link", subject: user.email, detail: "New setup link sent" }));
}

export function removeStaffUser(userId: string, by: string) {
  const a = store.get();
  const user = a.users.find((u) => u.id === userId);
  if (!user) return;
  if (user.role === "administrator" && activeAdmins(a).length === 1 && user.status !== "disabled") throw new Error("This is the last active administrator, so it stays.");
  store.set(logged({ ...a, users: a.users.filter((u) => u.id !== userId) }, { by, kind: "removed", subject: user.email, detail: user.name }));
}

/** The preview's sign in: marks the person active, with the time, and logs it. */
export function recordSignIn(person: { name?: string; email?: string; role: string }) {
  if (!person.email) return;
  const a = store.get();
  const email = norm(person.email);
  const users = a.users.map((u) => (norm(u.email) === email ? { ...u, lastSignInAt: now(), status: u.status === "invited" ? ("active" as const) : u.status } : u));
  store.set(logged({ ...a, users }, { by: `${person.name ?? email}, ${labelOf(a, person.role)}`, kind: "signin", subject: email, detail: "Signed in to the console" }));
}

/** What the signed-in person may do on the staff screens. */
export function canDo(myRole: string, staffAccess: Access) {
  const admin = myRole === "administrator";
  const edit = staffAccess === "edit";
  return {
    manageRoles: admin,
    addPeople: edit,
    /** Changing or removing this person, and giving this role. */
    changePerson: (u: StaffUser) => edit && (admin || u.role !== "administrator"),
    giveRole: (role: string) => edit && (admin || role !== "administrator"),
  };
}

export const EVENT_LABEL: Record<StaffEventKind, string> = {
  signin: "Signed in",
  added: "Added",
  role: "Role changed",
  disabled: "Disabled",
  enabled: "Enabled",
  removed: "Removed",
  link: "Setup link",
  "role-created": "Role created",
  "role-edited": "Role edited",
  "role-deleted": "Role deleted",
};
