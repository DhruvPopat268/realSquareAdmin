import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inquiriesService, type AssignedInquiryRecord } from "@/services/inquiriesService";
import Spinner from "@/components/Spinner";

const PAGE_LIMITS = [10, 20, 50, 100];

function formatDateTime(value?: string) {
  if (!value) return { date: "—", time: "—" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
    }),
  };
}

function DateTimeCell({ value }: { value?: string }) {
  const formatted = formatDateTime(value);
  return (
    <td className="px-4 py-3 whitespace-nowrap">
      <p>{formatted.date}</p>
      <p className="text-xs text-muted-foreground">{formatted.time}</p>
    </td>
  );
}

export default function ViewAssignedEnquiriesPage() {
  const { inquiryId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/enquiries";

  const [assignments, setAssignments] = useState<AssignedInquiryRecord[]>([]);
  const [stats, setStats] = useState({ totalAssigned: 0, totalPurchased: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    inquiriesService.getAssignmentsByInquiryId(inquiryId, { page, limit, status: status || undefined })
      .then(({ data }) => {
        if (cancelled) return;
        setAssignments(data.data);
        setStats(data.stats);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError?.response?.data?.message ?? "Could not load assigned requirements. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [inquiryId, page, limit, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(returnTo)} aria-label="Back to requirements">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assigned Requirements</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Assigned</p>
            <p className="text-xl font-bold text-blue-600">{stats.totalAssigned.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <ShoppingBag className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Purchased</p>
            <p className="text-xl font-bold text-green-600">{stats.totalPurchased.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(limit)} onValueChange={(value) => { setLimit(Number(value)); setPage(1); }}>
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_LIMITS.map((pageLimit) => <SelectItem key={pageLimit} value={String(pageLimit)}>{pageLimit}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{total} assignments</p>
        <div className="flex-1" />
        <Select value={status || "all"} onValueChange={(value) => { setStatus(value === "all" ? "" : value); setPage(1); }}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="purchased">Purchased</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Assigned To</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Assignment Source</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Created At</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Purchased Via</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Coins Deducted</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Purchased At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-16"><Spinner fullPage={false} size="md" label="Loading assigned requirements..." /></td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="py-16 text-center text-destructive">{error}</td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">No assignments found for this requirement.</td></tr>
            ) : assignments.map((assignment, index) => (
              <tr key={assignment._id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{(page - 1) * limit + index + 1}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-medium text-foreground">{assignment.assignedTo?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{assignment.assignedTo?.mobile ?? "—"}</p>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground whitespace-nowrap">{assignment.assignedTo?.role?.name ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${assignment.status === "purchased" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {assignment.status}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground whitespace-nowrap">{assignment.assignmentSource}</td>
                <DateTimeCell value={assignment.assignedAt} />
                <td className="px-4 py-3 capitalize text-muted-foreground whitespace-nowrap">{assignment.purchasedVia ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{assignment.coinsUsed?.toLocaleString() ?? "—"}</td>
                <DateTimeCell value={assignment.purchasedAt} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Page {page} of {Math.max(1, totalPages)}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((current) => current - 1)} disabled={loading || page <= 1}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={loading || page >= totalPages}>Next</Button>
      </div>
    </div>
  );
}
