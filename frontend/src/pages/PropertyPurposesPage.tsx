import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, ChevronDown } from "lucide-react";
import { PROPERTY_PURPOSES, type PropertyPurpose } from "@/data/propertyPurposesData";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
    hour12: true, timeZone: "Asia/Kolkata",
  }).toUpperCase();
  return { date, time };
}

const empty = { name: "", description: "", isActive: true };

export default function PropertyPurposesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");
  const [data, setData] = useState(PROPERTY_PURPOSES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<{ name?: string }>({}); 

  function toggleActive(id: string) {
    setData((prev) =>
      prev.map((p) => p.id === id ? { ...p, isActive: !p.isActive } : p)
    );
  }

  function openDialog() {
    setForm(empty);
    setErrors({});
    setOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    const now = new Date().toISOString();
    const newEntry: PropertyPurpose = {
      id: `pp-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
      createdAt: now,
      updatedAt: now,
    };
    setData((prev) => [newEntry, ...prev]);
    setOpen(false);
  }

  const filtered = useMemo(() => {
    return data.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Yes" && p.isActive) ||
        (statusFilter === "No" && !p.isActive);
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Purposes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define the intent of a listing — Sell, Rent, PG / Co-living, etc.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openDialog}>
          <Plus className="h-3.5 w-3.5" /> Add Purpose
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search purposes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>

        <div className="flex-1" />

        <p className="text-sm text-muted-foreground">{filtered.length} purpose{filtered.length !== 1 ? "s" : ""}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter === "All" ? "All" : statusFilter}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Yes")}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("No")}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-16">
                  No purposes found
                </td>
              </tr>
            ) : (
              filtered.map((p: PropertyPurpose, i) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-sm">
                    <span className="line-clamp-2">{p.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={() => toggleActive(p.id)}
                        className="scale-90"
                      />
                      <span className={`text-xs font-medium ${p.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                        {p.isActive ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-foreground">{fmtDate(p.createdAt).date}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.createdAt).time}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-foreground">{fmtDate(p.updatedAt).date}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.updatedAt).time}</p>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>
                          {p.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Property Purpose</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pp-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="pp-name"
                placeholder="e.g. Sell, Rent, PG / Co-living"
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors({}); }}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-desc">Description</Label>
              <Textarea
                id="pp-desc"
                placeholder="Brief description of this purpose..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pp-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="pp-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <span className={`text-xs font-medium ${form.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                  {form.isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Purpose</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
