import api from "@/lib/axiosInterceptor";

export const autoApprovalConfigService = {
  getAll: () =>
    api.get<{ success: boolean; data: Record<string, boolean> }>("/admin/auto-approval-config"),
  upsert: (roleId: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: { roleId: string; isActive: boolean } }>(
      "/admin/auto-approval-config",
      { roleId, isActive }
    ),
};
