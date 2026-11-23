/**
 * The Retailer Dashboard's sections. The live dashboard had fifteen tiles
 * (docs/CONTEXT.md, "Retailer Dashboard"); after the client's feedback of 27
 * October 2026 the dashboard keeps what dealers use day to day and puts the
 * account first: billing (invoices, payments and statement; the Phase 2
 * payment portal brought forward), orders and memo, ordering, and the
 * dealer's own account. The marketing, catalog, social, training, website,
 * SPIF, authorized users and policies tiles are out of the navigation until
 * Surreal asks for them back (Q5); their notes stay in docs/CONTEXT.md.
 *
 * The sidebar lists the dashboard's own pages only (client task list,
 * November 2026, item 21): Diamond search, Made to Order, Diamond Legacy,
 * Custom jewelry and the cart are in the site header already, so they left it.
 * The dashboard home still links to them where it helps.
 *
 * billing: shown to the store's account owner only, not to associates.
 */

import { CUSTOM_PORTAL_URL } from "./site";

export type DashIcon =
  | "home" | "orders" | "memo" | "cart" | "search" | "m2o" | "legacy" | "custom"
  | "invoices" | "shows" | "payments" | "account";

export type DashGroup = "Overview" | "Billing" | "Orders and memo" | "Your account";

export interface DashSection {
  id: string;
  label: string;
  line: string;
  href: string;
  group: DashGroup;
  icon: DashIcon;
  /** Opens outside the site (the existing custom order portal). */
  external?: boolean;
  /** Billing pages: the account owner sees them; associates do not. */
  billing?: boolean;
  /** Marked New in the navigation. */
  fresh?: boolean;
}

export const dashGroups: DashGroup[] = ["Overview", "Billing", "Orders and memo", "Your account"];

export { CUSTOM_PORTAL_URL };

export const dashSections: DashSection[] = [
  { id: "home", label: "Dashboard", line: "Your store at a glance", href: "/dashboard", group: "Overview", icon: "home" },

  { id: "invoices", label: "Invoices and payments", line: "Open invoices, payments and your statement", href: "/dashboard/invoices", group: "Billing", icon: "invoices", billing: true, fresh: true },
  { id: "payments", label: "Payment methods", line: "Cards and bank accounts on file", href: "/dashboard/payments", group: "Billing", icon: "payments", billing: true },

  { id: "orders", label: "Orders", line: "Order history and one-click reorder", href: "/dashboard/orders", group: "Orders and memo", icon: "orders" },
  { id: "memo", label: "Open memo items", line: "Memo reconciliation, prices updated daily", href: "/dashboard/memo", group: "Orders and memo", icon: "memo" },

  { id: "trade-shows", label: "Trade show appointments", line: "Meet us at the shows", href: "/dashboard/trade-shows", group: "Your account", icon: "shows" },
  { id: "account", label: "Account settings", line: "Your details and password", href: "/dashboard/account", group: "Your account", icon: "account" },
];

export const dashSection = (id: string) => dashSections.find((d) => d.id === id);
