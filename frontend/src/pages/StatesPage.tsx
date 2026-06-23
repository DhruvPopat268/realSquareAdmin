import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, ChevronDown } from "lucide-react";
import { STATES, type State } from "@/data/statesData";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function StatesPage() {
  const [data, setData]                 = useState(STATES);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");
  const [open, setOpen]                 = useState(false);
  const [name, setName]                 = useState("");
  const [isActive, setIsActive]         = useState(true);
  const [nameError, setNameError]       = useState("");

  function toggleActive(id: string) {
    setData((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !s.isActive, updatedAt: new Date().toISOString() } : s));
  }

  function openDialog() { setName(""); setIsActive(true); setNameError(""); setOpen(true); }

  function handleSubmit() {
    if (!name.trim()) { setNameError("Name is required"); return; }
    const now = new Date().toISOString();
    const newState: State = { id: `s-${Date.now()}`, name: name.trim(), isActive, createdAt: now, updatedAt: now };
    setData((prev) => [newState, ...prev]);
    setOpen(false);
  }

  const filtered = useMemo(() =>
    data.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || (statusFilter === "Yes" ? s.isActive : !s.isActive);
      return matchSearch && matchStatus;
    }), [data, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">States</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage states available for property listings.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openDialog}>
          <Plus className="h-3.5 w-3.5" /> Add State
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search states..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{filtered.length} state{filtered.length !== 1 ? "s" : ""}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Is Active: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Yes")}>Yes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("No")}>No</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-16">No states found</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s.id)} className="scale-90" />
                    <span className={`text-xs font-medium ${s.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {s.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(s.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(s.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(s.updatedAt).time}</p>
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
                      <DropdownMenuItem onClick={() => toggleActive(s.id)}>{s.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add State</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="state-name">Name <span className="text-destructive">*</span></Label>
              <Input id="state-name" placeholder="e.g. Maharashtra" value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="state-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="state-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create State</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
