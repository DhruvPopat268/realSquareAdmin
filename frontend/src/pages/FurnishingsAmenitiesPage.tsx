import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2, ArrowUp, ArrowDown, ImagePlus } from "lucide-react";
import { furnishingsAmenitiesService, type FurnishingAmenity } from "@/services/furnishingsAmenitiesService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

const typeColors: Record<string, string> = {
  Furnishing: "bg-purple-50 text-purple-700 border border-purple-200",
  Amenity:    "bg-teal-50 text-teal-700 border border-teal-200",
};

export default function FurnishingsAmenitiesPage() {
  const { toast } = useToast();

  const [data, setData]                 = useState<FurnishingAmenity[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");
  const [typeFilter, setTypeFilter]     = useState<"All" | "Furnishing" | "Amenity">("All");

  // dialog
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState<FurnishingAmenity | null>(null);
  const [name, setName]             = useState("");
  const [type, setType]             = useState<"Furnishing" | "Amenity">("Furnishing");
  const [hasCount, setHasCount]     = useState(false);
  const [iconFile, setIconFile]     = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const iconInputRef                = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive]     = useState(true);
  const [errors, setErrors]         = useState<{ name?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<FurnishingAmenity | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  function buildParams(sf: "All" | "Yes" | "No", tf: "All" | "Furnishing" | "Amenity", q: string) {
    const p: Record<string, string> = {};
    if (sf === "Yes") p.isActive = "true";
    if (sf === "No")  p.isActive = "false";
    if (tf !== "All") p.type = tf;
    if (q?.trim())    p.search = q.trim();
    return p;
  }

  async function fetchData(sf: "All" | "Yes" | "No", tf: "All" | "Furnishing" | "Amenity", q: string) {
    setLoading(true);
    try {
      const res = await furnishingsAmenitiesService.getAll(buildParams(sf, tf, q));
      setData(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load furnishings & amenities" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData("All", "All", ""); }, []);

  const hasFilters = search !== "" || statusFilter !== "All" || typeFilter !== "All";

  function clearFilters() {
    setSearch(""); setStatusFilter("All"); setTypeFilter("All");
    fetchData("All", "All", "");
  }

  function openCreate() {
    setEditTarget(null); setName(""); setType("Furnishing"); setHasCount(false);
    setIconFile(null); setIconPreview(""); setIsActive(true); setErrors({}); setOpen(true);
  }

  function openEdit(item: FurnishingAmenity) {
    setEditTarget(item); setName(item.name); setType(item.type); setHasCount(item.hasCount);
    setIconFile(null); setIconPreview(item.icon ?? ""); setIsActive(item.isActive); setErrors({}); setOpen(true);
  }

  async function handleSubmit() {
    const errs: { name?: string } = {};
    if (!name.trim()) errs.name = "Name is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await furnishingsAmenitiesService.update(editTarget._id, { name: name.trim(), type, hasCount, isActive }, iconFile);
        setData((prev) => prev.map((i) => i._id === editTarget._id ? res.data.data : i));
        toast({ title: "Updated successfully" });
      } else {
        const res = await furnishingsAmenitiesService.create({ name: name.trim(), type, hasCount, isActive }, iconFile);
        setData((prev) => [...prev, res.data.data]);
        toast({ title: "Created successfully" });
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setErrors((e) => ({ ...e, name: "Name already exists for this type" }));
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: FurnishingAmenity) {
    try {
      const res = await furnishingsAmenitiesService.update(item._id, { isActive: !item.isActive });
      setData((prev) => prev.map((i) => i._id === item._id ? res.data.data : i));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function handleReorder(item: FurnishingAmenity, direction: "up" | "down") {
    try {
      const res = await furnishingsAmenitiesService.reorder(item._id, direction);
      setData((prev) => [
        ...prev.filter((i) => i.type !== item.type),
        ...res.data.data,
      ].sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order));
    } catch {
      toast({ variant: "destructive", title: "Failed to reorder" });
    }
  }

  function openDelete(item: FurnishingAmenity) { setDeleteTarget(item); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await furnishingsAmenitiesService.remove(deleteTarget._id);
      setData((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      toast({ title: "Deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Furnishings &amp; Amenities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage flat furnishings and society amenities.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchData(statusFilter, typeFilter, e.target.value); }}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{data.length} item{data.length !== 1 ? "s" : ""}</p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">
            Clear all
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Type: {typeFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setTypeFilter("All");        fetchData(statusFilter, "All",        search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTypeFilter("Furnishing"); fetchData(statusFilter, "Furnishing", search); }}>Furnishing</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTypeFilter("Amenity");    fetchData(statusFilter, "Amenity",    search); }}>Amenity</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setStatusFilter("All"); fetchData("All", typeFilter, search); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Yes"); fetchData("Yes", typeFilter, search); }}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("No");  fetchData("No",  typeFilter, search); }}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-36">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Icon</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Has Count</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Display Order</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-16"><Spinner size="md" label="Loading..." /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-muted-foreground py-16">No items found</td></tr>
            ) : data.map((item, i) => {
              const sameType = data.filter((d) => d.type === item.type).sort((a, b) => a.order - b.order);
              const isFirst  = sameType[0]?._id === item._id;
              const isLast   = sameType[sameType.length - 1]?._id === item._id;
              return (
                <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReorder(item, "up")}
                        disabled={isFirst}
                        className="p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleReorder(item, "down")}
                        disabled={isLast}
                        className="p-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openDelete(item)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-12 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-3 w-16">
                    {item.icon ? (
                      item.icon.startsWith("http") || item.icon.startsWith("/") ? (
                        <img src={item.icon} alt={item.name} className="h-7 w-7 object-contain rounded" />
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">{item.icon}</span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${item.hasCount ? "text-green-600" : "text-muted-foreground"}`}>
                      {item.hasCount ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={item.isActive} onCheckedChange={() => toggleActive(item)} className="scale-90" />
                      <span className={`text-xs font-medium ${item.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                        {item.isActive ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-foreground">{fmtDate(item.createdAt).date}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(item.createdAt).time}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-foreground">{fmtDate(item.updatedAt).date}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(item.updatedAt).time}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Item" : "Add Furnishing / Amenity"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. AC, Swimming Pool"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: undefined })); }}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span>{type}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  <DropdownMenuItem onClick={() => setType("Furnishing")}>Furnishing</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setType("Amenity")}>Amenity</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-1.5">
              <Label>Icon Image</Label>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setIconFile(f);
                  setIconPreview(f ? URL.createObjectURL(f) : (editTarget?.icon ?? ""));
                }}
              />
              <div className="flex items-center gap-3">
                {iconPreview ? (
                  <img src={iconPreview} alt="icon preview" className="h-12 w-12 rounded-md object-contain border bg-muted" />
                ) : (
                  <div className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => iconInputRef.current?.click()}>
                  {iconPreview ? "Change Image" : "Upload Image"}
                </Button>
                {iconPreview && (
                  <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => { setIconFile(null); setIconPreview(""); }}>Remove</button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · max 5 MB</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Has Count (quantity selector)</Label>
              <div className="flex items-center gap-2">
                <Switch checked={hasCount} onCheckedChange={setHasCount} />
                <span className={`text-xs font-medium ${hasCount ? "text-green-600" : "text-muted-foreground"}`}>{hasCount ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
