/**
 * Staff and roles calls to the Surreal API (B6), used by the console when
 * API_AUTH is on. The API applies every rule (who may add, give a role,
 * manage roles); the screens only offer what it will accept.
 */

import { apiFetch, type ApiResponse } from "./client";

export type ApiStaff = ApiResponse<"/api/v1/admin/staff", "get">[number];
export type ApiRole = ApiResponse<"/api/v1/admin/roles", "get">[number];
export type ApiActivity = ApiResponse<"/api/v1/admin/activity", "get">;
export type ApiLinkResult = ApiResponse<"/api/v1/admin/staff/{userId}/link", "post">;
export type ApiAdded = ApiResponse<"/api/v1/admin/staff", "post">;
export type Access = "edit" | "view" | "none";

const send = <T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) =>
  apiFetch<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const staffApi = {
  list: () => apiFetch<ApiStaff[]>("/admin/staff"),
  add: (input: { name: string; email: string; role: string }) => send<ApiAdded>("POST", "/admin/staff", input),
  update: (id: string, change: { role?: string; status?: "active" | "disabled" }) => send<void>("PATCH", `/admin/staff/${id}`, change),
  link: (id: string) => send<ApiLinkResult>("POST", `/admin/staff/${id}/link`),
  remove: (id: string) => send<void>("DELETE", `/admin/staff/${id}`),
  roles: () => apiFetch<ApiRole[]>("/admin/roles"),
  createRole: (input: { label: string; line?: string; access: Record<string, Access> }) => send<{ id: string }>("POST", "/admin/roles", input),
  updateRole: (id: string, input: { label?: string; line?: string; access?: Record<string, Access> }) => send<void>("PATCH", `/admin/roles/${encodeURIComponent(id)}`, input),
  deleteRole: (id: string) => send<void>("DELETE", `/admin/roles/${encodeURIComponent(id)}`),
  activity: (show: "all" | "signins" | "changes", page: number) => apiFetch<ApiActivity>(`/admin/activity?show=${show}&page=${page}`),
};
