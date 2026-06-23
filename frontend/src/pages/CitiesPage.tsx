import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, ChevronDown } from "lucide-react";
import { CITIES, type City } from "@/data/citiesData";
import { STATES } from "@/data/statesData";

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return { date, time };
}

export default function CitiesPage() {
  const [data, setData]                 = useState(CITIES);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Yes" | "No">("All");
  const [stateFilter, setStateFilter]   = useState("All");
  const [open, setOpen]                 = useState(false);
  const [name, setName]                 = useState("");
  const [state, setState]               = useState("");
  const [isActive, setIsActive]         = useState(true);
  const [errors, setErrors]             = useState<{ name?: string; state?: string }>({});

  const activeStates = useMemo(() => STATES.filter((s) => s.isActive), []);

  function toggleActive(id: string) {
    setData((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString() } : c));
  }

  function openDialog() { setName(""); setState(""); setIsActive(true); setErrors({}); setOpen(true); }

  function handleSubmit() {
    const errs: { name?: string; state?: string } = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!state)       errs.state = "State is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const now = new Date().toISOString();
    const newCity: City = { id: `c-${Date.now()}`, name: name.trim(), state, isActive, createdAt: now, updatedAt: now };
    setData((prev) => [newCity, ...prev]);
    setOpen(false);
  }

  const filtered = useMemo(() =>
    data.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.state.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || (statusFilter === "Yes" ? c.isActive : !c.isActive);
      const matchState  = stateFilter  === "All" || c.state === stateFilter;
      return matchSearch && matchStatus && matchState;
    }), [data, search, statusFilter, stateFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage cities available for property listings.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openDialog}>
          <Plus className="h-3.5 w-3.5" /> Add City
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search cities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{filtered.length} cit{filtered.length !== 1 ? "ies" : "y"}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              State: {stateFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStateFilter("All")}>All</DropdownMenuItem>
            {STATES.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => setStateFilter(s.name)}>{s.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Is Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-16">No cities found</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.state}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c.id)} className="scale-90" />
                    <span className={`text-xs font-medium ${c.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {c.isActive ? "Yes" : "No"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(c.createdAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt).time}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm text-foreground">{fmtDate(c.updatedAt).date}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.updatedAt).time}</p>
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
                      <DropdownMenuItem onClick={() => toggleActive(c.id)}>{c.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>Add City</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="city-name">Name <span className="text-destructive">*</span></Label>
              <Input id="city-name" placeholder="e.g. Mumbai" value={name} onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: undefined })); }} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>State <span className="text-destructive">*</span></Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className={state ? "text-foreground" : "text-muted-foreground"}>{state || "Select a state"}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {activeStates.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => { setState(s.name); setErrors((er) => ({ ...er, state: undefined })); }}>
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="city-active">Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch id="city-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create City</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
