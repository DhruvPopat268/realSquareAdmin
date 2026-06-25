import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, User, Handshake, Building2 } from "lucide-react";

type Role = "Owner" | "Agent / Broker" | "Builder / Developer";

interface RoleConfig {
  role: Role;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
  enabled: boolean;
}

const INITIAL_CONFIG: RoleConfig[] = [
  {
    role: "Owner",
    icon: User,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    description: "Properties listed directly by property owners will be auto-approved and go live immediately without manual review.",
    enabled: false,
  },
  {
    role: "Agent / Broker",
    icon: Handshake,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    description: "Properties listed by registered agents or brokers will be auto-approved and go live immediately without manual review.",
    enabled: false,
  },
  {
    role: "Builder / Developer",
    icon: Building2,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    description: "Properties listed by builders or developers will be auto-approved and go live immediately without manual review.",
    enabled: true,
  },
];

export default function AutoApprovalConfigPage() {
  const [configs, setConfigs] = useState<RoleConfig[]>(INITIAL_CONFIG);

  function toggle(role: Role) {
    setConfigs((prev) => prev.map((c) => c.role === role ? { ...c, enabled: !c.enabled } : c));
  }

  const enabledCount = configs.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auto Approval Config</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure which roles have their property listings auto-approved</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {enabledCount} of {configs.length} roles enabled
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
        <p>When auto approval is <strong>enabled</strong> for a role, any property listed by a user of that role will be automatically approved and set to <strong>Available</strong> status without requiring manual admin review. When <strong>disabled</strong>, listings will be held for manual review.</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {configs.map((c) => (
          <div key={c.role} className={`rounded-xl border bg-card p-5 flex flex-col gap-4 transition-all ${c.enabled ? "border-green-200 shadow-sm" : ""}`}>
            <div className="flex items-center justify-between">
              <div className={`h-10 w-10 rounded-full ${c.iconBg} flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 ${c.iconColor}`} />
              </div>
              <Switch checked={c.enabled} onCheckedChange={() => toggle(c.role)} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{c.role}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
            </div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${c.enabled ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
              {c.enabled ? "Auto Approval ON" : "Manual Review"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
