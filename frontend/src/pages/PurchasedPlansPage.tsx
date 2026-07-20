import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ChevronLeft, ChevronRight, X, CheckCircle2, Clock, Archive } from "lucide-react";
import { purchasedPlansService, type PurchasedPlan } from "@/services/purchasedPlansService";
import { systemUsersService, type ActiveUser } from "@/services/systemUsersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

const LIMITS = [10, 20, 50, 100];

interface Query { page: number; limit: number; status: string; userType: string; userId: string; }
const DEFAULT_QUERY: Query = { page: 1, limit: 10, status: "", userType: "", userId: "" };

function userName(u: PurchasedPlan["user"]) {
  return u.ownerProfile?.fullName ?? u.brokerProfile?.fullName ?? u.builderProfile?.name ?? u.mobile;
}

const STATUS_VARIANTS: Record<string, "default" | "destructive" | "secondary"> = {
  Active: "default",
  Expired: "destructive",
  Consumed: "secondary",
};

export default function PurchasedPlansPage() {
  const { toast } = useToast();

  const [plans, setPlans]       = useState<PurchasedPlan[]>([]);
  const [stats, setStats]       = useState({ active: 0, expired: 0, consumed: 0 });
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  const [pending, setPending] = useState<Query>(DEFAULT_QUERY);
  const [query, setQuery]     = useState<Query>(DEFAULT_QUERY);

  const hasFilters = query.status || query.userType || query.userId;

  useEffect(() => {
    systemUsersService.getActiveUsers()
      .then((res) => setActiveUsers(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page: query.page, limit: query.limit };
        if (query.status)   params.status   = query.status;
        if (query.userType) params.userType = query.userType;
        if (query.userId)   params.userId   = query.userId;

        const res = await purchasedPlansService.getAll(params);
        setPlans(res.data.data);
        setStats(res.data.stats);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      } catch {
        toast({ variant: "destructive", title: "Failed to load purchased plans" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [query]);

  function set(key: keyof Query, v: string) {
    setPending((p) => ({ ...p, [key]: v === "all" ? "" : v }));
  }

  function applyFilters() { setQuery({ ...pending, page: 1 }); }
  function clearFilters() { setPending(DEFAULT_QUERY); setQuery(DEFAULT_QUERY); }
  function goToPage(p: number) { setQuery((q) => ({ ...q, page: p })); }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Purchased Plans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All plan purchases by users.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-green-600">{stats.active.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expired</p>
            <p className="text-xl font-bold text-red-500">{stats.expired.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Archive className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Consumed</p>
            <p className="text-xl font-bold">{stats.consumed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(query.limit)} onValueChange={(v) => setQuery((q) => ({ ...q, page: 1, limit: Number(v) }))}>
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LIMITS.map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</p>
        <div className="flex-1" />
        <Select value={pending.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Select Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["Active", "Expired", "Consumed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pending.userType} onValueChange={(v) => set("userType", v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Select User Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All User Types</SelectItem>
            {["Owner", "Broker", "Builder"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pending.userId} onValueChange={(v) => set("userId", v)}>
          <SelectTrigger className="h-9 w-56 text-sm"><SelectValue placeholder="Select User" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {activeUsers.map((u) => (
              <SelectItem key={u._id} value={u._id}>
                {u.name ?? u.mobile} — {u.roleName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" onClick={applyFilters}>Apply</Button>
        {hasFilters && (
          <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Spinner fullPage={false} size="md" label="Loading purchased plans..." />
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <FileText className="h-8 w-8 opacity-30" />
          <p className="text-base font-medium">No purchased plans found</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">User Type</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Plan Type</th>
                <th className="px-4 py-3 text-left">Expiry Type</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Coins</th>
                <th className="px-4 py-3 text-left">Properties</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Purchased At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {plans.map((p, index) => (
                <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{(query.page - 1) * query.limit + index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{userName(p.user)}</p>
                    <p className="text-xs text-muted-foreground">{p.user.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.userType}</td>
                  <td className="px-4 py-3 font-medium">{p.plan.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.plan.planType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.plan.expiryType ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.paymentMethod}</td>
                  <td className="px-4 py-3">{p.amountPaid > 0 ? `₹${p.amountPaid.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">{p.coinsPaid > 0 ? p.coinsPaid.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.propertiesUsed} / {p.plan.numberOfPropertiesGiven}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>{new Date(p.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>
                    <p className="text-muted-foreground">{new Date(p.expiryDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"} className="text-xs">{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>
                    <p className="text-muted-foreground">{new Date(p.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Page {query.page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={query.page === 1} onClick={() => goToPage(query.page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={query.page === totalPages} onClick={() => goToPage(query.page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
