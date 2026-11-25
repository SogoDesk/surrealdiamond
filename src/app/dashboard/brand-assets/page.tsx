import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/DashboardShell";
import BrandAssets from "@/components/dashboard/BrandAssets";

export const metadata: Metadata = { title: "Brand assets | Retailer Dashboard | Surreal Diamond", robots: { index: false } };

export default function Page() {
  return (
    <DashboardShell>
      <BrandAssets />
    </DashboardShell>
  );
}
