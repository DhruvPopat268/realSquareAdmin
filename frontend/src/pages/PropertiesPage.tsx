import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Filter, ArrowUpDown, LayoutGrid, List,
  Bed, Bath, Maximize2, MapPin, MoreVertical,
} from "lucide-react";
import { PROPERTIES, type Property } from "@/data/propertiesData";

const statusStyle: Record<string, string> = {
  Available:    "bg-green-50 text-green-700 border border-green-200",
  Sold:         "bg-gray-100 text-gray-600 border border-gray-200",
  Rented:       "bg-blue-50 text-blue-600 border border-blue-200",
  "Under Offer":"bg-amber-50 text-amber-600 border border-amber-200",
};

const typeStyle: Record<string, string> = {
  "For Sale": "bg-blue-50 text-blue-600",
  "For Rent": "bg-green-50 text-green-600",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function PropertyCard({ p, onClick }: { p: Property; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden">
        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle[p.listingType]}`}>{p.listingType}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{p.status}</span>
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 h-7 w-7 bg-white/90 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-lg font-bold text-foreground">{fmt(p.price)}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{p.title}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 shrink-0" />{p.address}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.beds} Beds</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.baths} Baths</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.sqft.toLocaleString()} sqft</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{p.propertyType}</span>
          <span className="text-xs text-muted-foreground">{p.agent}</span>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ p, onClick }: { p: Property; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={p.images[0]} alt={p.title} className="h-12 w-16 rounded-lg object-cover shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">{p.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.propertyType}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle[p.listingType]}`}>{p.listingType}</span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-foreground">{fmt(p.price)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.beds}</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.baths}</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.sqft.toLocaleString()}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{p.status}</span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{p.agent}</td>
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

export default function PropertiesPage({ filterType }: { filterType?: "For Sale" | "For Rent" }) {
  const navigate = useNavigate();
  const [search, setSearch]     = useState("");
  const [view, setView]         = useState<"grid" | "list">("grid");
  const [sort, setSort]         = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [typeFilter, setTypeFilter] = useState<string>(filterType ?? "All");

  const filtered = useMemo(() => {
    let list = PROPERTIES.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.propertyType.toLowerCase().includes(q);
      const matchType = typeFilter === "All" || p.listingType === typeFilter;
      return matchSearch && matchType;
    });
    if (sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [search, sort, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Properties</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Property
        </Button>
      </div>

      {/* Toolbar */}
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

        {/* Type filter tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
          {["All", "For Sale", "For Rent"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>{t}</button>
          ))}
        </div>

        <div className="flex-1" />

        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sort === "newest" ? "Newest" : sort === "price-asc" ? "Price ↑" : "Price ↓"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSort("newest")}>Newest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("price-asc")}>Price: Low to High</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("price-desc")}>Price: High to Low</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
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

      {/* Count */}
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
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listing</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
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
