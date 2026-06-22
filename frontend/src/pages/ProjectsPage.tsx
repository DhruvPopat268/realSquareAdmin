import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Filter, ArrowUpDown, MapPin, Users,
  MoreVertical, Building2, Calendar, TrendingUp,
} from "lucide-react";
import { PROJECTS, type Project, type ProjectStatus, type ProjectType } from "@/data/projectsData";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const typeStyle: Record<ProjectType, string> = {
  Residential: "bg-sky-50 text-sky-600",
  Commercial:  "bg-orange-50 text-orange-600",
  "Mixed Use": "bg-teal-50 text-teal-600",
  Industrial:  "bg-gray-100 text-gray-600",
};

const progressColor: Record<ProjectStatus, string> = {
  Active:    "bg-green-500",
  Completed: "bg-blue-500",
  "On Hold": "bg-amber-400",
  Planning:  "bg-purple-400",
};

// ─── Summary stats ────────────────────────────────────────────────────────────
const STATS = [
  { label: "Total Projects",    value: PROJECTS.length },
  { label: "Active",            value: PROJECTS.filter((p) => p.status === "Active").length },
  { label: "Completed",         value: PROJECTS.filter((p) => p.status === "Completed").length },
  { label: "Total Units",       value: PROJECTS.reduce((s, p) => s + p.totalUnits, 0) },
  { label: "Units Sold",        value: PROJECTS.reduce((s, p) => s + p.soldUnits, 0) },
];

// ─── Card ─────────────────────────────────────────────────────────────────────
function ProjectCard({ p, onClick }: { p: Project; onClick: () => void }) {
  const pctSold = Math.round((p.soldUnits / p.totalUnits) * 100);

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={p.image}
          alt={p.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle[p.type]}`}>{p.type}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{p.status}</span>
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 h-7 w-7 bg-white/90 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
        {p.status === "Completed" && (
          <div className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-white text-[11px] font-semibold text-center py-1">
            SOLD OUT
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-foreground text-sm leading-snug">{p.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{p.developer}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 shrink-0" />{p.city}
          </div>
        </div>

        {/* Price range */}
        <div>
          <span className="text-base font-bold text-foreground">{fmt(p.priceFrom)}</span>
          <span className="text-sm text-muted-foreground"> – {fmt(p.priceTo)}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{p.soldUnits} / {p.totalUnits} units sold</span>
            <span className="font-medium text-foreground">{pctSold}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor[p.status]}`}
              style={{ width: `${p.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Construction {p.progress}%</span>
            <span>Est. {p.completionDate}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{p.agent}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{p.launchDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter]   = useState("All");
  const [sort, setSort]               = useState<"newest" | "progress" | "units">("newest");

  const filtered = useMemo(() => {
    let list = PROJECTS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        p.developer.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || p.status === statusFilter;
      const matchType   = typeFilter === "All"   || p.type   === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
    if (sort === "progress") list = [...list].sort((a, b) => b.progress - a.progress);
    if (sort === "units")    list = [...list].sort((a, b) => b.totalUnits - a.totalUnits);
    return list;
  }, [search, statusFilter, typeFilter, sort]);

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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
          {["All", "Active", "Planning", "On Hold", "Completed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >{s}</button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {typeFilter === "All" ? "All Types" : typeFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Residential", "Commercial", "Mixed Use", "Industrial"].map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>{t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sort === "newest" ? "Newest" : sort === "progress" ? "By Progress" : "By Units"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSort("newest")}>Newest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("progress")}>By Progress</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("units")}>By Total Units</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          No projects match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
