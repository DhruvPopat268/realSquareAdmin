import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MapPin, Users, MoreVertical, Calendar, TrendingUp, ChevronDown } from "lucide-react";
import { PROJECTS, type Project, type ProjectStatus } from "@/data/projectsData";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

const statusStyle: Record<ProjectStatus, string> = {
  Active:    "bg-green-50 text-green-700 border border-green-200",
  Completed: "bg-blue-50 text-blue-700 border border-blue-200",
  "On Hold": "bg-amber-50 text-amber-600 border border-amber-200",
  Planning:  "bg-purple-50 text-purple-600 border border-purple-200",
};

const progressColor: Record<ProjectStatus, string> = {
  Active:    "bg-green-500",
  Completed: "bg-blue-500",
  "On Hold": "bg-amber-400",
  Planning:  "bg-purple-400",
};

const STATS = [
  { label: "Total Projects", value: PROJECTS.length },
  { label: "Active",         value: PROJECTS.filter((p) => p.status === "Active").length },
  { label: "Completed",      value: PROJECTS.filter((p) => p.status === "Completed").length },
  { label: "Total Units",    value: PROJECTS.reduce((s, p) => s + p.totalUnits, 0) },
  { label: "Units Sold",     value: PROJECTS.reduce((s, p) => s + p.soldUnits, 0) },
];

function ProjectRow({ p, onClick }: { p: Project; onClick: () => void }) {
  const pctSold = Math.round((p.soldUnits / p.totalUnits) * 100);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={p.image} alt={p.title} className="h-12 w-16 rounded-lg object-cover shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">{p.title}</p>
            <p className="text-xs text-muted-foreground">{p.developer}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{p.city}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.type}</td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{p.status}</span>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        <span className="font-semibold">{fmt(p.priceFrom)}</span>
        <span className="text-muted-foreground"> – {fmt(p.priceTo)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1 min-w-[120px]">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{p.soldUnits}/{p.totalUnits} sold</span>
            <span>{pctSold}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progressColor[p.status]}`} style={{ width: `${p.progress}%` }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.agent}</div>
        <div className="flex items-center gap-1 mt-0.5"><Calendar className="h-3.5 w-3.5" />{p.launchDate}</div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Est. {p.completionDate}</div>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filtered = useMemo(() =>
    PROJECTS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = p.title.toLowerCase().includes(q) || p.developer.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
      const matchStatus   = statusFilter   === "All" || p.status === statusFilter;
      const matchCategory = categoryFilter === "All" || p.type   === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    }), [search, statusFilter, categoryFilter]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real estate development pipeline</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Project
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>

        <div className="flex-1" />

        <p className="text-sm text-muted-foreground">{filtered.length} project{filtered.length !== 1 ? "s" : ""}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Category: {categoryFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Residential", "Commercial", "Mixed Use", "Industrial"].map((c) => (
              <DropdownMenuItem key={c} onClick={() => setCategoryFilter(c)}>{c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Status: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Active", "Planning", "On Hold", "Completed"].map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List view */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">No projects match your search.</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price Range</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Completion</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProjectRow key={p.id} p={p} onClick={() => navigate(`/projects/${p.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
