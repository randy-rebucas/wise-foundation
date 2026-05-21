import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isMaintenanceMode } from "@/lib/utils/maintenance";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE } from "@/lib/purchaseOrders/orgTypeDiscountDefaults";

const BLOCKED_ROLES = ["MEMBER", "CUSTOMER"];

interface Props {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Ensure no access if maintenance is enabled
  if (isMaintenanceMode()) {
    redirect("/maintenance");
  }

  if (BLOCKED_ROLES.includes(session.user.role)) {
    if (session.user.role === "CUSTOMER") {
      redirect("/account");
    }
    redirect("/login?error=access_denied");
  }

  const sidebarUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    permissions: session.user.permissions,
    organizationId: session.user.organizationId ?? null,
    organizationCapabilities: session.user.organizationCapabilities ?? null,
  };

  let tenantSettings: PublicAppSettings;
  try {
    tenantSettings = await getPublicAppSettings();
  } catch (err) {
    console.error("[dashboard layout] settings load failed", err);
    tenantSettings = {
      appName: "Glowish",
      appTagline: "POS & online store",
      appLogoUrl: "",
      currency: "PHP",
      timezone: "Asia/Manila",
      memberDefaultDiscountPercent: 10,
      defaultLowStockThreshold: 10,
      receiptFooter: "",
      purchaseOrderDiscountByOrgType: { ...DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE },
      imageUploadEnabled: false,
    };
  }

  return (
    <DashboardShell initialUser={sidebarUser} tenantSettings={tenantSettings}>
      {children}
    </DashboardShell>
  );
}
