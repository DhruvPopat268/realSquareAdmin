import { UserRound, UserRoundCheck, UserRoundX, UserRoundMinus } from "lucide-react";

export interface UserStatusCounts {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
}

const items = [
  { key: "total", label: "Total", icon: UserRound, color: "text-slate-700", bg: "bg-slate-100" },
  { key: "active", label: "Active", icon: UserRoundCheck, color: "text-green-700", bg: "bg-green-100" },
  { key: "inactive", label: "Inactive", icon: UserRoundMinus, color: "text-amber-700", bg: "bg-amber-100" },
  { key: "deleted", label: "Deleted", icon: UserRoundX, color: "text-red-600", bg: "bg-red-100" },
] as const;

export default function UserStatusStats({ stats }: { stats: UserStatusCounts }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{stats[key].toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
