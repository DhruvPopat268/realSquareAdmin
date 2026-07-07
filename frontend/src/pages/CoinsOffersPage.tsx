import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, ChevronDown, Pencil, Trash2, IndianRupee, Coins } from "lucide-react";
import { coinsOffersService, type CoinsOffer, type CoinsOfferPayload } from "@/services/coinsOffersService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";

const defaultForm = (): CoinsOfferPayload => ({
  name: "", description: "", coins: 0, amount: 0, isActive: true,
});

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

export default function CoinsOffersPage() {
  const { toast } = useToast();

  const [data, setData]               = useState<CoinsOffer[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");

  const [open, setOpen]               = useState(false);
  const [editTarget, setEditTarget]   = useState<CoinsOffer | null>(null);
  const [form, setForm]               = useState<CoinsOfferPayload>(defaultForm());
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [submitting, setSubmitting]   = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CoinsOffer | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  function buildParams(sf = statusFilter, q = search) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (q.trim())     p.search   = q.trim();
    return p;
  }

  async function fetchOffers(sf = statusFilter, q = search) {
    setLoading(true);
    try {
      const res = await coinsOffersService.getAll(buildParams(sf, q));
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load coins offers" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOffers("All", ""); }, []);

  function set<K extends keyof CoinsOfferPayload>(key: K, val: CoinsOfferPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name   = "Name is required";
    if (form.coins <= 0)   e.coins  = "Must be greater than 0";
    if (form.amount <= 0)  e.amount = "Must be greater than 0";
    return e;
  }

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm());
    setErrors({});
    setOpen(true);
  }

  function openEdit(offer: CoinsOffer) {
    setEditTarget(offer);
    setForm({ name: offer.name, description: offer.description ?? "", coins: offer.coins, amount: offer.amount, isActive: offer.isActive });
    setErrors({});
    setOpen(true);
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await coinsOffersService.update(editTarget._id, form);
        setData((prev) => prev.map((o) => o._id === editTarget._id ? res.data.data : o));
        toast({ title: "Coins offer updated successfully" });
      } else {
        const res = await coinsOffersService.create(form);
        setData((prev) => [res.data.data, ...prev]);
        toast({ title: "Coins offer created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setErrors({ name: "Coins offer name already exists" });
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(offer: CoinsOffer) {
    try {
      const res = await coinsOffersService.toggleActive(offer._id);
      setData((prev) => prev.map((o) => o._id === offer._id ? res.data.data : o));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await coinsOffersService.remove(deleteTarget._id);
      setData((prev) => prev.filter((o) => o._id !== deleteTarget._id));
      toast({ title: "Coins offer deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete coins offer" });
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = search !== "" || statusFilter !== "All";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coins Offers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage coin packages users can purchase.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Offer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search offers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchOffers(statusFilter, e.target.value); }}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} offer{data.length !== 1 ? "s" : ""}</p>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatusFilter("All"); fetchOffers("All", ""); }} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">
            Clear all
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["All", "Yes", "No"] as const).map((s) => (
              <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); fetchOffers(s, search); }}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Coins</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Amount (₹)</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-16"><Spinner fullPage={false} size="md" label="Loading offers..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-muted-foreground py-16">No coins offers found</td></tr>
            ) : data.map((offer, i) => (
              <tr key={offer._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(offer)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setDeleteTarget(offer); setDeleteOpen(true); }} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{offer.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{offer.description || "—"}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Coins className="h-3.5 w-3.5" />{offer.coins}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-0.5 font-medium text-primary">
                    <IndianRupee className="h-3.5 w-3.5" />{offer.amount}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={offer.isActive} onCheckedChange={() => toggleActive(offer)} className="scale-90" />
                    <span className={cn("text-xs font-medium", offer.isActive ? "text-green-600" : "text-muted-foreground")}>
                      {offer.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(offer.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(offer.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Coins Offer" : "Add Coins Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Starter Pack, Mega Bundle" value={form.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description..." value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Coins <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} placeholder="0" value={form.coins || ""} onChange={(e) => set("coins", Number(e.target.value))} />
                {errors.coins && <p className="text-xs text-destructive">{errors.coins}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} placeholder="0" value={form.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
                <span className={cn("text-xs font-medium", form.isActive ? "text-green-600" : "text-muted-foreground")}>
                  {form.isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (editTarget ? "Updating..." : "Creating...") : editTarget ? "Update Offer" : "Create Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Coins Offer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
