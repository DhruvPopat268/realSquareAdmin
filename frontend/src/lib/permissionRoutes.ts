const PERMISSION_ROUTES: { key: string; path: string }[] = [
  { key: "dashboard",     path: "/dashboard" },
  { key: "properties",    path: "/properties" },
  { key: "projects",      path: "/projects" },
  { key: "leads",         path: "/leads" },
  { key: "offers",        path: "/offers" },
  { key: "agreements",    path: "/agreements" },
  { key: "transactions",  path: "/transactions" },
  { key: "contacts",      path: "/contacts" },
  { key: "brokers",       path: "/brokers" },
  { key: "owners",        path: "/owners" },
  { key: "campaigns",     path: "/campaigns" },
  { key: "calendar",      path: "/calendar" },
  { key: "reports",       path: "/reports/sales" },
  { key: "documents",     path: "/documents" },
];

export const getFirstAllowedRoute = (permissions: string[], role: string): string => {
  if (role === "Admin") return "/dashboard";
  const match = PERMISSION_ROUTES.find((r) => permissions.includes(r.key));
  return match ? match.path : "/profile";
};
