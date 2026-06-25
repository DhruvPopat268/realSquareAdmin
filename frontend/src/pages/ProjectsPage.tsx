import { useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MapPin, Calendar, ChevronDown, Pencil, Trash2, Eye, LayoutGrid, List, Map } from "lucide-react";
import { PROJECTS, type Project, type ProjectStage, type ListingStatus, PROJECT_STAGE_LABEL, LISTING_STATUS_LABEL } from "@/data/projectsData";
import ProjectMapView from "@/components/ProjectMapView";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

const stageStyle: Record<ProjectStage, string> = {
  PRE_LAUNCH:         "bg-purple-50 text-purple-600 border border-purple-200",
  NEW_LAUNCH:         "bg-blue-50 text-blue-600 border border-blue-200",
  UNDER_CONSTRUCTION: "bg-amber-50 text-amber-600 border border-amber-200",
  READY_TO_MOVE:      "bg-green-50 text-green-700 border border-green-200",
  SOLD_OUT:           "bg-gray-100 text-gray-600 border border-gray-200",
};

const listingStatusStyle: Record<ListingStatus, string> = {
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ACTIVE:           "bg-green-50 text-green-700 border border-green-200",
  SOLD:             "bg-gray-100 text-gray-600 border border-gray-200",
  EXPIRED:          "bg-orange-50 text-orange-700 border border-orange-200",
  INACTIVE:         "bg-slate-100 text-slate-500 border border-slate-200",
  ARCHIVED:         "bg-stone-100 text-stone-500 border border-stone-200",
  REJECTED:         "bg-red-50 text-red-600 border border-red-200",
};

const progressColor: Record<ProjectStage, string> = {
  PRE_LAUNCH:         "bg-purple-400",
  NEW_LAUNCH:         "bg-blue-500",
  UNDER_CONSTRUCTION: "bg-amber-400",
  READY_TO_MOVE:      "bg-green-500",
  SOLD_OUT:           "bg-gray-400",
};

const STATS = [
  { label: "Total Projects",      value: PROJECTS.length,                                                  color: "bg-card" },
  { label: "Pre Launch",          value: PROJECTS.filter((p) => p.stage === "PRE_LAUNCH").length,           color: "bg-purple-50" },
  { label: "New Launch",          value: PROJECTS.filter((p) => p.stage === "NEW_LAUNCH").length,           color: "bg-blue-50" },
  { label: "Under Construction",  value: PROJECTS.filter((p) => p.stage === "UNDER_CONSTRUCTION").length,  color: "bg-amber-50" },
  { label: "Ready To Move",       value: PROJECTS.filter((p) => p.stage === "READY_TO_MOVE").length,       color: "bg-green-50" },
  { label: "Sold Out",            value: PROJECTS.filter((p) => p.stage === "SOLD_OUT").length,            color: "bg-gray-50" },
];

const LISTING_STATS = [
  { label: "Pending Approval", value: PROJECTS.filter((p) => p.listingStatus === "PENDING_APPROVAL").length, color: "bg-yellow-50",  text: "text-yellow-700" },
  { label: "Active",           value: PROJECTS.filter((p) => p.listingStatus === "ACTIVE").length,           color: "bg-green-50",  text: "text-green-700"  },
  { label: "Sold",             value: PROJECTS.filter((p) => p.listingStatus === "SOLD").length,             color: "bg-gray-50",   text: "text-gray-600"   },
  { label: "Expired",          value: PROJECTS.filter((p) => p.listingStatus === "EXPIRED").length,          color: "bg-orange-50", text: "text-orange-700" },
  { label: "Inactive",         value: PROJECTS.filter((p) => p.listingStatus === "INACTIVE").length,         color: "bg-slate-100", text: "text-slate-600"  },
  { label: "Archived",         value: PROJECTS.filter((p) => p.listingStatus === "ARCHIVED").length,         color: "bg-stone-100", text: "text-stone-600"  },
  { label: "Rejected",         value: PROJECTS.filter((p) => p.listingStatus === "REJECTED").length,         color: "bg-red-50",    text: "text-red-600"    },
];

function ProjectCard({ p, onClick }: { p: Project; onClick: () => void }) {
  const pctSold = Math.round((p.soldUnits / p.totalUnits) * 100);
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden">
        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageStyle[p.stage]}`}>{PROJECT_STAGE_LABEL[p.stage]}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${listingStatusStyle[p.listingStatus]}`}>{LISTING_STATUS_LABEL[p.listingStatus]}</span>
        </div>
        <div className="absolute top-3 right-3 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-1.5 rounded-full bg-white/90 hover:bg-green-50 text-green-600 transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-full bg-white/90 hover:bg-blue-50 text-blue-600 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-full bg-white/90 hover:bg-red-50 text-red-500 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-bold text-foreground">{fmt(p.priceFrom)} – {fmt(p.priceTo)}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{p.title}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 shrink-0" />{p.city}
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{p.soldUnits}/{p.totalUnits} units sold</span>
            <span>{pctSold}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progressColor[p.stage]}`} style={{ width: `${p.progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.category} · {p.type}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />{p.possessionDate}
          </div>
        </div>
      </div>
    </div>
  );
}
function ProjectRow({ p, onClick }: { p: Project; onClick: () => void }) {
  const pctSold = Math.round((p.soldUnits / p.totalUnits) * 100);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={onClick} className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 text-green-600 transition-colors"><Eye className="h-3.5 w-3.5" /></button>
          <button className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={p.images[0]} alt={p.title} className="h-12 w-16 rounded-lg object-cover shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">{p.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{p.city}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{p.reraNumber}</td>
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-foreground">{p.developer.company}</p>
      </td>
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-foreground">{p.developer.salesManager}</p>
        <p className="text-muted-foreground">{p.developer.mobile}</p>
        <p className="text-muted-foreground">{p.developer.email}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.category}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.type}</td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stageStyle[p.stage]}`}>{PROJECT_STAGE_LABEL[p.stage]}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${listingStatusStyle[p.listingStatus]}`}>{LISTING_STATUS_LABEL[p.listingStatus]}</span>
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
            <div className={`h-full rounded-full ${progressColor[p.stage]}`} style={{ width: `${p.progress}%` }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{p.possessionDate}</div>
      </td>
      <td className="px-4 py-3 text-xs">
        <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground mb-1">{p.listedByType}</span>
      </td>
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-foreground">{p.listedByInfo.name}</p>
        <p className="text-muted-foreground">{p.listedByInfo.mobile}</p>
        <p className="text-muted-foreground">{p.listedByInfo.email}</p>
      </td>
      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{p.leads}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{p.views}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{p.wishlist}</td>
    </tr>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [search, setSearch]               = useState(state?.listedByName ?? "");
  const [view, setView] = useState<"grid" | "list" | "map">("list");
  const [stageFilter, setStageFilter]               = useState("All");
  const [listingStatusFilter, setListingStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter]         = useState("All");
  const [developerFilter, setDeveloperFilter] = useState("All");
  const [listedByFilter, setListedByFilter]   = useState(state?.listedByType ?? "All");

  const hasFilters = stageFilter !== "All" || listingStatusFilter !== "All" || categoryFilter !== "All" || typeFilter !== "All" || developerFilter !== "All" || listedByFilter !== "All" || search !== "";

  function clearAll() {
    setSearch(""); setStageFilter("All"); setListingStatusFilter("All");
    setCategoryFilter("All"); setTypeFilter("All"); setDeveloperFilter("All"); setListedByFilter("All");
  }

  const developerNames = useMemo(() => ["All", ...Array.from(new Set(PROJECTS.map((p) => p.developer.company)))], []);
  const filteredTypes  = useMemo(() => ["All", ...Array.from(new Set(PROJECTS.filter((p) => categoryFilter === "All" || p.category === categoryFilter).map((p) => p.type)))], [categoryFilter]);

  const tableRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft")  tableRef.current?.scrollBy({ left: -200, behavior: "smooth" });
    if (e.key === "ArrowRight") tableRef.current?.scrollBy({ left:  200, behavior: "smooth" });
  }

  const filtered = useMemo(() => PROJECTS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = p.title.toLowerCase().includes(q) || p.developer.salesManager.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.listedByInfo.name.toLowerCase().includes(q);
      const matchStage         = stageFilter         === "All" || p.stage         === stageFilter;
      const matchListingStatus = listingStatusFilter === "All" || p.listingStatus === listingStatusFilter;
      const matchCategory  = categoryFilter  === "All" || p.category          === categoryFilter;
      const matchType      = typeFilter      === "All" || p.type              === typeFilter;
      const matchDeveloper = developerFilter === "All" || p.developer.company === developerFilter;
      const matchListedBy  = listedByFilter  === "All" || p.listedByType      === listedByFilter;
      return matchSearch && matchStage && matchListingStatus && matchCategory && matchType && matchDeveloper && matchListedBy;
    }), [search, stageFilter, listingStatusFilter, categoryFilter, typeFilter, developerFilter, listedByFilter]);

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

      {/* Stats strip - Stage */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl border px-4 py-3`}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Stats strip - Listing Status */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {LISTING_STATS.map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl border px-4 py-3`}>
            <p className={`text-xs ${s.text}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.text} mt-0.5`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar - Row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              {categoryFilter === "All" ? "All Categories" : categoryFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Residential", "Commercial", "Mixed Use", "Industrial"].map((c) => (
              <DropdownMenuItem key={c} onClick={() => { setCategoryFilter(c); setTypeFilter("All"); }}>{c === "All" ? "All Categories" : c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              {typeFilter === "All" ? "All Types" : typeFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {filteredTypes.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>{t === "All" ? "All Types" : t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              {stageFilter === "All" ? "All Stages" : PROJECT_STAGE_LABEL[stageFilter as ProjectStage]} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["All", "PRE_LAUNCH", "NEW_LAUNCH", "UNDER_CONSTRUCTION", "READY_TO_MOVE", "SOLD_OUT"] as const).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStageFilter(s)}>{s === "All" ? "All Stages" : PROJECT_STAGE_LABEL[s]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5 border rounded-lg p-1">
          <button onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("map")}
            className={`p-1.5 rounded-md transition-colors ${view === "map" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}>
            <Map className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar - Row 2 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1" />

        <p className="text-sm text-muted-foreground">{filtered.length} project{filtered.length !== 1 ? "s" : ""}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              {developerFilter === "All" ? "All Builders" : developerFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {developerNames.map((d) => (
              <DropdownMenuItem key={d} onClick={() => setDeveloperFilter(d)}>{d === "All" ? "All Builders" : d}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              {listingStatusFilter === "All" ? "All Statuses" : LISTING_STATUS_LABEL[listingStatusFilter as ListingStatus]} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["All", "PENDING_APPROVAL", "ACTIVE", "SOLD", "EXPIRED", "INACTIVE", "ARCHIVED", "REJECTED"] as const).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setListingStatusFilter(s)}>{s === "All" ? "All Statuses" : LISTING_STATUS_LABEL[s]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              {listedByFilter === "All" ? "All Listed By" : listedByFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Owner", "Agent / Broker", "Builder / Developer"].map((t) => (
              <DropdownMenuItem key={t} onClick={() => setListedByFilter(t)}>{t === "All" ? "All Listed By" : t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <button onClick={clearAll} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors ml-1 underline underline-offset-2">Clear all</button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} project{filtered.length !== 1 ? "s" : ""} found</p>

      {/* Map view */}
      {view === "map" && (
        <ProjectMapView projects={filtered} onViewProject={(id) => navigate(`/projects/${id}`)} />
      )}

      {/* Grid view */}
      {view === "grid" && (
        filtered.length === 0
          ? <p className="text-center text-muted-foreground py-16">No projects found</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {filtered.map((p) => (
                <ProjectCard key={p.id} p={p} onClick={() => navigate(`/projects/${p.id}`)} />
              ))}
            </div>
      )}

      {/* List view */}
      {view === "list" && (
        filtered.length === 0
          ? <div className="flex items-center justify-center h-48 text-muted-foreground">No projects match your search.</div>
          : (
        <div className="rounded-lg border bg-card overflow-x-auto" ref={tableRef} tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: "none" }}>
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">RERA Number</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Builder / Developer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Sales Manager</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[160px]">Project Stage</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[160px]">Listing Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price Range</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Possession</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Listed By</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Listed By Info</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Leads</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Views</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Saved</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProjectRow key={p.id} p={p} onClick={() => navigate(`/projects/${p.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
          )
      )}
    </div>
  );
}
