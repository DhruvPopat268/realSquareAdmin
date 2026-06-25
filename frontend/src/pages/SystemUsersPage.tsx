import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { CITIES } from "@/data/citiesData";

type Role = "Agent / Broker" | "Builder / Developer" | "Support Team" | "Owner";

const ROLES: Role[] = ["Agent / Broker", "Builder / Developer", "Support Team", "Owner"];
const GST_ROLES: Role[] = ["Agent / Broker", "Builder / Developer", "Owner"];

interface SystemUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  city: string;
  role: Role;
  gstNumber?: string;
  photo?: string;
  isActive: boolean;
  createdAt: string;
}

const DUMMY_USERS: SystemUser[] = [
  { id: 1, name: "Ravi Sharma",    email: "ravi@example.com",    mobile: "+91 98001 11001", city: "Mumbai",    role: "Support Team",         isActive: true,  createdAt: "10 Jan, 2024" },
  { id: 2, name: "Priya Mehta",    email: "priya@example.com",   mobile: "+91 98001 11002", city: "Pune",      role: "Agent / Broker",     gstNumber: "27AABCU9603R1ZV", isActive: true,  createdAt: "12 Jan, 2024" },
  { id: 3, name: "Arjun Nair",     email: "arjun@example.com",   mobile: "+91 98001 11003", city: "Bangalore", role: "Builder / Developer",gstNumber: "29AABCU9603R1ZX", isActive: true,  createdAt: "15 Jan, 2024" },
  { id: 4, name: "Sneha Patel",    email: "sneha@example.com",   mobile: "+91 98001 11004", city: "Ahmedabad", role: "Support Team",        isActive: true,  createdAt: "18 Jan, 2024" },
  { id: 5, name: "Vikram Singh",   email: "vikram@example.com",  mobile: "+91 98001 11005", city: "Delhi",     role: "Agent / Broker",     gstNumber: "07AABCU9603R1ZY", isActive: false, createdAt: "20 Jan, 2024" },
  { id: 6, name: "Meena Iyer",     email: "meena@example.com",   mobile: "+91 98001 11006", city: "Chennai",   role: "Support Team",        isActive: true,  createdAt: "22 Jan, 2024" },
  { id: 7, name: "Karan Joshi",    email: "karan@example.com",   mobile: "+91 98001 11007", city: "Hyderabad", role: "Builder / Developer",gstNumber: "36AABCU9603R1ZZ", isActive: true,  createdAt: "25 Jan, 2024" },
  { id: 8, name: "Anita Desai",    email: "anita@example.com",   mobile: "+91 98001 11008", city: "Kolkata",   role: "Support Team",        isActive: true,  createdAt: "28 Jan, 2024" },
];

const PAGE_SIZES = [10, 25, 50];

const roleBadgeStyles: Record<Role, string> = {
  "Agent / Broker":     "bg-amber-50 text-amber-600 border border-amber-200",
  "Builder / Developer":"bg-teal-50 text-teal-600 border border-teal-200",
  "Support Team":       "bg-gray-50 text-gray-600 border border-gray-200",
  "Owner":              "bg-indigo-50 text-indigo-600 border border-indigo-200",
};

const INIT_FORM = { name: "", email: "", mobile: "", city: "", role: "" as Role | "", gstNumber: "", photo: "" };

export default function SystemUsersPage() {
  const [users, setUsers]           = useState<SystemUser[]>(DUMMY_USERS);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [selected, setSelected]     = useState<number[]>([]);
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);

  const [open, setOpen]       = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);
  const [form, setForm]       = useState(INIT_FORM);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [errors, setErrors]   = useState<Partial<typeof INIT_FORM>>({});
  const fileRef               = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.mobile.includes(q);
      const matchRole   = roleFilter === "All" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allChecked  = paged.length > 0 && paged.every((u) => selected.includes(u.id));
  const someChecked = paged.some((u) => selected.includes(u.id));

  const toggleAll = () =>
    setSelected(allChecked ? selected.filter((id) => !paged.find((u) => u.id === id)) : [...new Set([...selected, ...paged.map((u) => u.id)])]);
  const toggle = (id: number) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const showGst = GST_ROLES.includes(form.role as Role);

  function openCreate() {
    setEditId(null);
    setForm(INIT_FORM);
    setPhotoPreview("");
    setErrors({});
    setOpen(true);
  }

  function openEdit(u: SystemUser) {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, mobile: u.mobile, city: u.city, role: u.role, gstNumber: u.gstNumber ?? "", photo: u.photo ?? "" });
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
    if (!form.name.trim())  errs.name   = "Name is required";
    if (!form.email.trim()) errs.email  = "Email is required";
    if (!form.mobile.trim()) errs.mobile = "Mobile is required";
    if (!form.city)         errs.city   = "City is required";
    if (!form.role)         errs.role   = "Role is required" as any;
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    if (editId !== null) {
      setUsers((prev) => prev.map((u) => u.id === editId ? { ...u, ...form, role: form.role as Role, gstNumber: showGst ? form.gstNumber : undefined, photo: photoPreview || undefined } : u));
    } else {
      const newUser: SystemUser = { id: Date.now(), name: form.name, email: form.email, mobile: form.mobile, city: form.city, role: form.role as Role, gstNumber: showGst ? form.gstNumber : undefined, photo: photoPreview || undefined, isActive: true, createdAt: now };
      setUsers((prev) => [newUser, ...prev]);
    }
    setOpen(false);
  }

  function deleteUser(id: number) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
  }

  function set(key: keyof typeof INIT_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">System Users</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold" disabled={selected.length === 0}>
                Bulk Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setUsers((p) => p.filter((u) => !selected.includes(u.id))); setSelected([]); }}>Delete selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Add User
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9 w-64 text-sm" />
        </div>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={roleFilter !== "All" ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[150px] justify-between">
              {roleFilter === "All" ? "All Roles" : roleFilter} <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRoleFilter("All"); setPage(1); }}>All Roles</DropdownMenuItem>
            {ROLES.map((r) => <DropdownMenuItem key={r} onClick={() => { setRoleFilter(r); setPage(1); }}>{r}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">GST Number</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Created</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-muted-foreground py-12">No users found</td></tr>
            ) : paged.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3"><Checkbox checked={selected.includes(u.id)} onCheckedChange={() => toggle(u.id)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.photo ? (
                    <img src={u.photo} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.mobile}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeStyles[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.gstNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <Switch
                    checked={u.isActive}
                    onCheckedChange={(val) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: val } : x))}
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
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("..."); acc.push(p); return acc; }, [])
            .map((p, i) => p === "..." ? (
              <span key={`e-${i}`} className="px-1">···</span>
            ) : (
              <button key={p} onClick={() => setPage(p as number)} className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-muted-foreground">{form.name ? form.name.charAt(0).toUpperCase() : "?"}</span>
                )}
              </div>
              <div className="space-y-1">
                <Label>Photo</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </Button>
                  {photoPreview && (
                    <button type="button" onClick={() => { setPhotoPreview(""); setForm((f) => ({ ...f, photo: "" })); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
            </div>

            {/* Name & Mobile */}
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

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email ID <span className="text-destructive">*</span></Label>
              <Input placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* City & Role */}
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
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={form.role ? "text-foreground" : "text-muted-foreground"}>{form.role || "Select role"}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {ROLES.map((r) => <DropdownMenuItem key={r} onClick={() => set("role", r)}>{r}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>

            {/* GST — only for Agent/Broker & Builder/Developer */}
            {showGst && (
              <div className="space-y-1.5">
                <Label>GST Number</Label>
                <Input placeholder="e.g. 27AABCU9603R1ZV" value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editId ? "Save Changes" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
