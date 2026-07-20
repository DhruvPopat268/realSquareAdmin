import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { walletManagementService, type PaymentTransaction } from "@/services/walletManagementService";
import { systemUsersService, type ActiveUser } from "@/services/systemUsersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

const LIMITS = [10, 20, 50, 100];

const STATUS_VARIANTS: Record<string, "default" | "destructive" | "secondary"> = {
  Success: "default",
  Failed:  "destructive",
  Pending: "secondary",
};

const REASON_COLORS: Record<string, string> = {
  PlanPurchase:  "bg-blue-100 text-blue-700",
  CoinsPurchase: "bg-purple-100 text-purple-700",
  Refund:        "bg-yellow-100 text-yellow-700",
  AdminCredit:   "bg-green-100 text-green-700",
  AdminDebit:    "bg-red-100 text-red-700",
};

interface Query { page: number; limit: number; status: string; reason: string; userType: string; userId: string; }
const DEFAULT_QUERY: Query = { page: 1, limit: 10, status: "", reason: "", userType: "", userId: "" };

function userName(u: PaymentTransaction["user"]) {
  return u.ownerProfile?.fullName ?? u.brokerProfile?.fullName ?? u.builderProfile?.name ?? u.mobile;
}

export default function WalletTransactionsPage() {
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [stats, setStats]               = useState({ currentBalance: 0, totalCredited: 0, totalDebited: 0 });
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);

  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  const [pending, setPending] = useState<Query>(DEFAULT_QUERY);
  const [query, setQuery]     = useState<Query>(DEFAULT_QUERY);

  const hasFilters = query.status || query.reason || query.userType || query.userId;

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
        if (query.reason)   params.reason   = query.reason;
        if (query.userType) params.userType = query.userType;
        if (query.userId)   params.userId   = query.userId;

        const res = await walletManagementService.getTransactions(params);
        setTransactions(res.data.data);
        setStats(res.data.stats);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      } catch {
        toast({ variant: "destructive", title: "Failed to load wallet transactions" });
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
        <h1 className="text-2xl font-bold text-foreground">Wallet Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All payment transactions and admin wallet balance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold text-blue-600">₹{stats.currentBalance.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Credited</p>
            <p className="text-xl font-bold text-green-600">₹{stats.totalCredited.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Debited</p>
            <p className="text-xl font-bold text-red-500">₹{stats.totalDebited.toLocaleString()}</p>
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
        <p className="text-sm text-muted-foreground">{total} transaction{total !== 1 ? "s" : ""}</p>
        <div className="flex-1" />
        <Select value={pending.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Select Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["Pending", "Success", "Failed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pending.reason} onValueChange={(v) => set("reason", v)}>
          <SelectTrigger className="h-9 w-64 text-sm"><SelectValue placeholder="Select Reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {["PlanPurchase", "CoinsPurchase", "Refund", "AdminCredit", "AdminDebit"].map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
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
        <Spinner fullPage={false} size="md" label="Loading wallet transactions..." />
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <Wallet className="h-8 w-8 opacity-30" />
          <p className="text-base font-medium">No transactions found</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">User Type</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Balance Before</th>
                <th className="px-4 py-3 text-left">Balance After</th>
                <th className="px-4 py-3 text-left">Razorpay Order ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Transacted At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((txn, index) => (
                <tr key={txn._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{(query.page - 1) * query.limit + index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{userName(txn.user)}</p>
                    <p className="text-xs text-muted-foreground">{txn.user.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{txn.userType}</td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${REASON_COLORS[txn.reason] ?? "bg-muted text-muted-foreground"}`}>{txn.reason}</Badge></td>
                  <td className="px-4 py-3 font-semibold">₹{txn.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">₹{txn.balanceBefore.toLocaleString()}</td>
                  <td className="px-4 py-3">₹{txn.balanceAfter.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{txn.razorpayOrderId}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[txn.status] ?? "secondary"} className="text-xs">{txn.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{new Date(txn.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>
                    <p className="text-muted-foreground">{new Date(txn.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</p>
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
