import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, Upload, X, Eye, Building2, FolderOpen } from "lucide-react";
import { CITIES } from "@/data/citiesData";

export interface RoleUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  city: string;
  gstNumber?: string;
  photo?: string;
  isActive: boolean;
  createdAt: string;
  totalPropertiesListed?: number;
  activePropertiesListed?: number;
  autoApproval?: boolean;
}

const PAGE_SIZES = [10, 25, 50];
const INIT_FORM = { name: "", email: "", mobile: "", city: "", gstNumber: "", photo: "" };

interface Props {
  title: string;
  showGst: boolean;
  showPropertyStats?: boolean;
  initialData: RoleUser[];
  onViewProperties?: (user: RoleUser) => void;
  onViewProjects?: (user: RoleUser) => void;
}

export default function UserManagementPage({ title, showGst, showPropertyStats = false, initialData, onViewProperties, onViewProjects }: Props) {
  const [users, setUsers]       = useState<RoleUser[]>(initialData);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [navDialogUser, setNavDialogUser] = useState<RoleUser | null>(null);
  const [open, setOpen]                   = useState(false);
  const [editId, setEditId]               = useState<number | null>(null);
  const [form, setForm]                   = useState(INIT_FORM);
  const [photoPreview, setPhotoPreview]   = useState("");
  const [errors, setErrors]               = useState<Partial<typeof INIT_FORM>>({});
  const fileRef                           = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.mobile.includes(q));
  }, [users, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allChecked  = paged.length > 0 && paged.every((u) => selected.includes(u.id));
  const someChecked = paged.some((u) => selected.includes(u.id));

  const toggleAll = () =>
    setSelected(allChecked ? selected.filter((id) => !paged.find((u) => u.id === id)) : [...new Set([...selected, ...paged.map((u) => u.id)])]);
  const toggle = (id: number) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  function openCreate() { setEditId(null); setForm(INIT_FORM); setPhotoPreview(""); setErrors({}); setOpen(true); }

  function openEdit(u: RoleUser) {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, mobile: u.mobile, city: u.city, gstNumber: u.gstNumber ?? "", photo: u.photo ?? "" });
    setPhotoPreview(u.photo ?? "");
    setErrors({});
    setOpen(true);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setForm((f) => ({ ...f, photo: url }));
  }

  function validate() {
    const errs: Partial<typeof INIT_FORM> = {};
    if (!form.name.trim())   errs.name   = "Name is required";
    if (!form.email.trim())  errs.email  = "Email is required";
    if (!form.mobile.trim()) errs.mobile = "Mobile is required";
    if (!form.city)          errs.city   = "City is required";
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    if (editId !== null) {
      setUsers((prev) => prev.map((u) => u.id === editId ? { ...u, ...form, gstNumber: showGst ? form.gstNumber : undefined, photo: photoPreview || undefined } : u));
    } else {
      setUsers((prev) => [{ id: Date.now(), name: form.name, email: form.email, mobile: form.mobile, city: form.city, gstNumber: showGst ? form.gstNumber : undefined, photo: photoPreview || undefined, isActive: true, createdAt: now }, ...prev]);
    }
    setOpen(false);
  }

  function handleViewClick(u: RoleUser) {
    if (onViewProperties && onViewProjects) {
      setNavDialogUser(u);
    } else if (onViewProperties) {
      onViewProperties(u);
    }
  }

  function deleteUser(id: number) { setUsers((p) => p.filter((u) => u.id !== id)); setSelected((s) => s.filter((x) => x !== id)); }
  function set(key: keyof typeof INIT_FORM, value: string) { setForm((f) => ({ ...f, [key]: value })); setErrors((e) => ({ ...e, [key]: undefined })); }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold" disabled={selected.length === 0}>Bulk Action</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setUsers((p) => p.filter((u) => !selected.includes(u.id))); setSelected([]); }}>Delete selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> Add {title.split(" ")[0]}</Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9 w-64 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="min-w-max w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allChecked} data-state={someChecked && !allChecked ? "indeterminate" : undefined} onCheckedChange={toggleAll} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Photo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Mobile No.</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
              {showGst && <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">GST Number</th>}
              {showPropertyStats && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[110px] leading-tight">Total Properties<br />Listed</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[110px] leading-tight">Active Listed<br />Properties</th>
                </>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Auto Approval</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Created</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={showGst ? 10 : 9} className="text-center text-muted-foreground py-12">No {title.toLowerCase()} found</td></tr>
            ) : paged.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3"><Checkbox checked={selected.includes(u.id)} onCheckedChange={() => toggle(u.id)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {(onViewProperties || onViewProjects) && (
                      <button onClick={() => handleViewClick(u)} className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 text-green-600 transition-colors"><Eye className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.photo ? (
                    <img src={u.photo} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{u.name.charAt(0).toUpperCase()}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.mobile}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                {showGst && <td className="px-4 py-3 text-muted-foreground text-xs">{u.gstNumber ?? "—"}</td>}
                {showPropertyStats && (
                  <>
                    <td className="px-4 py-3 text-muted-foreground text-center">{u.totalPropertiesListed ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground text-center">{u.activePropertiesListed ?? 0}</td>
                  </>
                )}
                <td className="px-4 py-3">
                  <Switch checked={u.isActive} onCheckedChange={(val) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: val } : x))} />
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={u.autoApproval ?? false}
                    onCheckedChange={(val) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, autoApproval: val } : x))}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 rounded-md border bg-background px-2 text-xs">
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("..."); acc.push(p); return acc; }, [])
            .map((p, i) => p === "..." ? <span key={`e-${i}`} className="px-1">···</span> : (
              <button key={p} onClick={() => setPage(p as number)} className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Navigate Dialog — shown for agents/builders who can list both */}
      <Dialog open={!!navDialogUser} onOpenChange={() => setNavDialogUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>View Listings for {navDialogUser?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Where would you like to navigate?</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => { onViewProperties?.(navDialogUser!); setNavDialogUser(null); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-muted transition-colors"
            >
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">Properties</span>
            </button>
            <button
              onClick={() => { onViewProjects?.(navDialogUser!); setNavDialogUser(null); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-muted transition-colors"
            >
              <FolderOpen className="h-6 w-6 text-amber-600" />
              <span className="text-sm font-medium">Projects</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} {title.split(" ")[0]}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                {photoPreview ? <img src={photoPreview} alt="preview" className="h-full w-full object-cover" /> : <span className="text-xl font-semibold text-muted-foreground">{form.name ? form.name.charAt(0).toUpperCase() : "?"}</span>}
              </div>
              <div className="space-y-1">
                <Label>Photo</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button>
                  {photoPreview && <button type="button" onClick={() => { setPhotoPreview(""); setForm((f) => ({ ...f, photo: "" })); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="h-3.5 w-3.5" /></button>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile No. <span className="text-destructive">*</span></Label>
              <Input placeholder="+91 XXXXX XXXXX" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email ID <span className="text-destructive">*</span></Label>
              <Input placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>City <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={form.city ? "text-foreground" : "text-muted-foreground"}>{form.city || "Select city"}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-52 overflow-y-auto">
                  {CITIES.map((c) => <DropdownMenuItem key={c.id} onClick={() => set("city", c.name)}>{c.name}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>
            {showGst && (
              <div className="space-y-1.5">
                <Label>GST Number</Label>
                <Input placeholder="e.g. 27AABCU9603R1ZV" value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editId ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
