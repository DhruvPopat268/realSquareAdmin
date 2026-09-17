import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { systemUsersService } from "@/services/systemUsersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

interface IncompleteProfile {
  _id: string;
  name?: string;
  mobile: string;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZES = [10, 25, 50];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function IncompleteProfilesPage() {
  const { toast } = useToast();

  const [data, setData] = useState<IncompleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<IncompleteProfile | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      const res = await systemUsersService.getIncompleteProfiles(params);
      setData(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err?.response?.data?.message || "Failed to load profiles",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, [page, pageSize]);

  function goToPage(p: number) {
    setPage(p);
  }

  const paged = data; // Already paginated from backend

  function openDelete(profile: IncompleteProfile) {
    setDeleteTarget(profile);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await systemUsersService.deleteIncompleteProfile(deleteTarget._id);
      setData((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast({ title: "Profile deleted successfully" });
      setDeleteOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err?.response?.data?.message || "Failed to delete profile",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Incomplete Profiles</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage users with incomplete registration.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-16">
                  <Spinner fullPage={false} size="md" label="Loading profiles..." />
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-16">
                  No incomplete profiles found
                </td>
              </tr>
            ) : paged.map((profile, i) => (
              <tr key={profile._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 w-20">
                  <button
                    onClick={() => openDelete(profile)}
                    className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
                <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3 font-medium text-foreground">{profile.mobile}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(profile.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(profile.createdAt).time}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => goToPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page === totalPages || totalPages === 0} onClick={() => goToPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete the profile with mobile{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.mobile}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
