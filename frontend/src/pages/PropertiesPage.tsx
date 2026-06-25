import { useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, ChevronDown, LayoutGrid, List,
  Bed, Bath, Maximize2, MapPin, Car, Layers, Pencil, Trash2, Eye,
} from "lucide-react";
import { PROPERTIES, type Property, type ListingStatus, LISTING_STATUS_LABEL } from "@/data/propertiesData";
import { PROPERTY_PURPOSES } from "@/data/propertyPurposesData";
import { PROPERTY_TYPES } from "@/data/propertyTypesData";
import { PROPERTY_CATEGORIES } from "@/data/propertyCategoriesData";
import { CITIES } from "@/data/citiesData";

const statusStyle: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ACTIVE:           "bg-green-50 text-green-700 border border-green-200",
  RESERVED:         "bg-blue-50 text-blue-700 border border-blue-200",
  SOLD:             "bg-gray-100 text-gray-600 border border-gray-200",
  RENTED:           "bg-teal-50 text-teal-700 border border-teal-200",
  EXPIRED:          "bg-orange-50 text-orange-700 border border-orange-200",
  INACTIVE:         "bg-slate-100 text-slate-500 border border-slate-200",
  ARCHIVED:         "bg-stone-100 text-stone-500 border border-stone-200",
  REJECTED:         "bg-red-50 text-red-600 border border-red-200",
};

const purposeStyle: Record<string, string> = {
  "Sell":           "bg-blue-50 text-blue-700 border border-blue-200",
  "Rent":           "bg-green-50 text-green-700 border border-green-200",
  "PG / Co-living": "bg-purple-50 text-purple-700 border border-purple-200",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function PropertyCard({ p, onClick }: { p: Property; onClick: () => void }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden">
        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${purposeStyle[p.purpose] ?? "bg-muted text-muted-foreground"}`}>{p.purpose}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{LISTING_STATUS_LABEL[p.status]}</span>
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
        <p className="text-lg font-bold text-foreground">{fmt(p.price)}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{p.title}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 shrink-0" />{p.address}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground border-t pt-3 flex-wrap">
          {p.beds   !== undefined && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.beds} Beds</span>}
          {p.baths  !== undefined && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.baths} Baths</span>}
          {p.sqft !== undefined && <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.sqft.toLocaleString()} sqft</span>}
          {p.parking !== undefined && <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{p.parking}</span>}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.category} · {p.type}</span>
          <span className="text-xs text-muted-foreground">{p.listedByType}</span>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ p, onClick }: { p: Property; onClick: () => void }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={onClick} className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 text-green-600 transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={p.images[0]} alt={p.title} className="h-12 w-16 rounded-lg object-cover shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">{p.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${purposeStyle[p.purpose] ?? "bg-muted text-muted-foreground"}`}>{p.purpose}</span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.category}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.type}</td>
      <td className="px-4 py-3 text-sm font-semibold text-foreground">{fmt(p.price)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2 flex-wrap">
          {p.beds   !== undefined && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.beds}</span>}
          {p.baths  !== undefined && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.baths}</span>}
          {p.sqft !== undefined && <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.sqft.toLocaleString()}</span>}
          {p.floor  !== undefined && <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />Fl.{p.floor}</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{LISTING_STATUS_LABEL[p.status]}</span>
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

export default function PropertiesPage({ filterType, listedByType: lockedListedByType, listedByName }: { filterType?: string; listedByType?: string; listedByName?: string }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const resolvedListedByType = lockedListedByType ?? state?.listedByType;
  const resolvedListedByName = listedByName ?? state?.listedByName;
  const [search, setSearch]               = useState(resolvedListedByName ?? "");
  const [view, setView]                   = useState<"grid" | "list">("list");
  const [purposeFilter, setPurposeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter]       = useState("All");
  const [cityFilter, setCityFilter]       = useState("All");
  const [listedByFilter, setListedByFilter] = useState(resolvedListedByType ?? "All");
  const [statusFilter, setStatusFilter]     = useState("All");

  const hasFilters = purposeFilter !== "All" || categoryFilter !== "All" || typeFilter !== "All" || cityFilter !== "All" || listedByFilter !== "All" || statusFilter !== "All" || search !== "";

  function clearAll() {
    setSearch(""); setPurposeFilter("All"); setCategoryFilter("All");
    setTypeFilter("All"); setCityFilter("All"); setListedByFilter("All"); setStatusFilter("All");
  }

  // when filterType is provided it acts as a locked purpose filter
  const activePurpose = filterType ?? purposeFilter;

  const filteredTypes = useMemo(() =>
    ["All", ...PROPERTY_TYPES
      .filter((t) => categoryFilter === "All" || t.category === categoryFilter)
      .map((t) => t.name)
    ], [categoryFilter]);

  const tableRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft")  tableRef.current?.scrollBy({ left: -200, behavior: "smooth" });
    if (e.key === "ArrowRight") tableRef.current?.scrollBy({ left:  200, behavior: "smooth" });
  }

  const filtered = useMemo(() => {
    return PROPERTIES.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.purpose.toLowerCase().includes(q) ||
        p.listedByInfo.name.toLowerCase().includes(q);
      const matchPurpose  = activePurpose  === "All" || p.purpose      === activePurpose;
      const matchCategory = categoryFilter === "All" || p.category     === categoryFilter;
      const matchType     = typeFilter     === "All" || p.type         === typeFilter;
      const matchCity     = cityFilter     === "All" || p.city         === cityFilter;
      const matchListedBy = listedByFilter === "All" || p.listedByType === listedByFilter;
      const matchStatus   = statusFilter   === "All" || p.status       === statusFilter;
      return matchSearch && matchPurpose && matchCategory && matchType && matchCity && matchListedBy && matchStatus;
    });
  }, [search, activePurpose, categoryFilter, typeFilter, cityFilter, listedByFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {filterType ? `${filterType} Properties` : "Properties"}
        </h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Property
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4 col-span-1">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{PROPERTIES.length}</p>
        </div>
        <div className="rounded-xl border bg-yellow-50 p-4">
          <p className="text-xs text-yellow-600">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{PROPERTIES.filter((p) => p.status === "PENDING_APPROVAL").length}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-4">
          <p className="text-xs text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{PROPERTIES.filter((p) => p.status === "ACTIVE").length}</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-4">
          <p className="text-xs text-blue-600">Reserved</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{PROPERTIES.filter((p) => p.status === "RESERVED").length}</p>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Sold</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{PROPERTIES.filter((p) => p.status === "SOLD").length}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border bg-teal-50 p-4">
          <p className="text-xs text-teal-600">Rented</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{PROPERTIES.filter((p) => p.status === "RENTED").length}</p>
        </div>
        <div className="rounded-xl border bg-orange-50 p-4">
          <p className="text-xs text-orange-600">Expired</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{PROPERTIES.filter((p) => p.status === "EXPIRED").length}</p>
        </div>
        <div className="rounded-xl border bg-slate-100 p-4">
          <p className="text-xs text-slate-500">Inactive</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{PROPERTIES.filter((p) => p.status === "INACTIVE").length}</p>
        </div>
        <div className="rounded-xl border bg-stone-100 p-4">
          <p className="text-xs text-stone-500">Archived</p>
          <p className="text-2xl font-bold text-stone-600 mt-1">{PROPERTIES.filter((p) => p.status === "ARCHIVED").length}</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4">
          <p className="text-xs text-red-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{PROPERTIES.filter((p) => p.status === "REJECTED").length}</p>
        </div>
      </div>

      {/* Toolbar - Row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>

        <div className="flex-1" />

        {/* Purpose filter — hidden when a filterType is locked in */}
        {!filterType && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                {purposeFilter === "All" ? "All Purposes" : purposeFilter}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["All", ...PROPERTY_PURPOSES.map((p) => p.name)].map((t) => (
                <DropdownMenuItem key={t} onClick={() => { setPurposeFilter(t); setTypeFilter("All"); }}>
                  {t === "All" ? "All Purposes" : t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              {categoryFilter === "All" ? "All Categories" : categoryFilter}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setCategoryFilter("All"); setTypeFilter("All"); }}>All Categories</DropdownMenuItem>
            {PROPERTY_CATEGORIES.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => { setCategoryFilter(c.name); setTypeFilter("All"); }}>{c.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              {typeFilter === "All" ? "All Types" : typeFilter}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {filteredTypes.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>
                {t === "All" ? "All Types" : t}
              </DropdownMenuItem>
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
        </div>
      </div>

      {/* Toolbar - Row 2 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1" />
        {/* City filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              {cityFilter === "All" ? "All Cities" : cityFilter}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCityFilter("All")}>All Cities</DropdownMenuItem>
            {CITIES.filter((c) => c.isActive).map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => setCityFilter(c.name)}>{c.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Listed By filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              {listedByFilter === "All" ? "All Listed By" : listedByFilter}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Owner", "Agent / Broker", "Builder / Developer"].map((t) => (
              <DropdownMenuItem key={t} onClick={() => setListedByFilter(t)}>
                {t === "All" ? "All Listed By" : t}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              {statusFilter === "All" ? "All Statuses" : LISTING_STATUS_LABEL[statusFilter as ListingStatus]}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "PENDING_APPROVAL", "ACTIVE", "RESERVED", "SOLD", "RENTED", "EXPIRED", "INACTIVE", "ARCHIVED", "REJECTED"].map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                {s === "All" ? "All Statuses" : LISTING_STATUS_LABEL[s as ListingStatus]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <button onClick={clearAll} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors ml-1 underline underline-offset-2">Clear all</button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} propert{filtered.length !== 1 ? "ies" : "y"} found</p>

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.length === 0
            ? <p className="col-span-3 text-center text-muted-foreground py-16">No properties found</p>
            : filtered.map((p) => (
              <PropertyCard key={p.id} p={p} onClick={() => navigate(`/properties/${p.id}`)} />
            ))
          }
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-lg border bg-card overflow-x-auto" ref={tableRef} tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: "none" }}>
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purpose</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[160px]">Listing Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listed By</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listed By Info</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Leads</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Views</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Saved</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8} className="text-center text-muted-foreground py-16">No properties found</td></tr>
                : filtered.map((p) => (
                  <PropertyRow key={p.id} p={p} onClick={() => navigate(`/properties/${p.id}`)} />
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
