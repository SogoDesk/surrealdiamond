import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/DashboardShell";
import SpifProgram from "@/components/dashboard/SpifProgram";

export const metadata: Metadata = { title: "SPIF program | Retailer Dashboard | Surreal Diamond", robots: { index: false } };

export default function Page() {
  return (
    <DashboardShell>
      <SpifProgram />
    </DashboardShell>
  );
}
