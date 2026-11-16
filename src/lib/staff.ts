"use client";

/**
 * The console's copy of who is signed in: a person and their role. On the
 * live site it mirrors the API's session (StaffGate, SessionSync); in the
 * preview it is one of the staff list's people (lib/staffAdmin.ts, which
 * starts with the test accounts in src/content/testAccounts.ts), and signing
 * in is logged there. A role is a built in role or a custom one's id.
 */

import { authApi } from "./api/auth";
import { API_AUTH } from "./api/client";
import { createLocalStore } from "./localStore";
import { recordSignIn } from "./staffAdmin";

export interface StaffSession {
  role: string;
  /** From the API: the role's name and its access per module, as the server enforces them. */
  roleLabel?: string;
  access?: Record<string, "edit" | "view" | "none">;
  name?: string;
  email?: string;
}

const isSession = (v: unknown): v is StaffSession | null => v === null || (typeof v === "object" && v !== null && typeof (v as StaffSession).role === "string" && (v as StaffSession).role.length > 0);
const store = createLocalStore<StaffSession | null>("surreal-staff", null, isSession);

export const useStaff = store.useStore;
export const signInStaff = (role: string, person?: { name: string; email: string }) => {
  store.set({ role, ...(person && { name: person.name, email: person.email }) });
  if (!API_AUTH && person) recordSignIn({ ...person, role });
};
export const setStaffSession = (session: StaffSession | null) => store.set(session);
/** Forgets the screens' copy of the session, without calling the API. */
export const clearStaff = () => store.set(null);
/**
 * Waits for the API first: the sign-in screen asks who is signed in as soon as
 * it shows, and would be told "still you" while the sign out was on its way.
 */
export const signOutStaff = async () => {
  if (API_AUTH) await authApi.logout().catch(() => undefined);
  store.set(null);
};
