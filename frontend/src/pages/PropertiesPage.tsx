import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/axiosInterceptor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown, LayoutGrid, List, Map,
  Bed, Bath, Maximize2, Layers, Pencil, Trash2, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { type ListingStatus, LISTING_STATUS_LABEL } from "@/data/propertiesData";
import PropertyMapView from "@/components/PropertyMapView";
import Spinner from "@/components/Spinner";

// Statuses defined in the PropertyListing model
const LISTING_STATUSES = ["UnderReview", "Active", "Inactive", "Sold", "Rented", "Rejected"] as const;

interface FilterOption {
  _id: string;
  name: string;
}

const PAGE_SIZES = [10, 25, 50, 100];

const statusStyle: Record<string, string> = {
  UnderReview: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Active:      "bg-green-50 text-green-700 border border-green-200",
  Inactive:    "bg-slate-100 text-slate-600 border border-slate-200",
  Sold:        "bg-gray-100 text-gray-600 border border-gray-200",
  Rented:      "bg-teal-50 text-teal-700 border border-teal-200",
  Rejected:    "bg-red-50 text-red-600 border border-red-200",
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
  const [imgIdx, setImgIdx] = useState(0);
  const total = p.images.length;
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + total) % total); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % total); };
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-[9px] pb-0">
        <div className="relative h-52 overflow-hidden rounded-lg">
          <img src={p.images[imgIdx]} alt={p.title} className="w-full h-full object-cover transition-opacity duration-300" />
          {/* Top-left checkbox */}
          <div className="absolute top-3 left-3">
            <div className="h-7 w-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="h-4 w-4 rounded border-2 border-white" />
            </div>
          </div>
          {/* Top-right actions */}
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
          {/* Bottom - listing status badge */}
          <div className="absolute bottom-8 right-3 flex gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[p.status]}`}>{LISTING_STATUS_LABEL[p.status]}</span>
          </div>
          {/* Image dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {p.images.slice(0, 5).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-3 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="p-3">
        {/* Price */}
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-foreground">{fmt(p.price)}</p>
        </div>
        {/* Type for purpose */}
        <p className="text-sm text-muted-foreground mt-0.5">{p.type} for {p.purpose}</p>
        {/* Address */}
        <p className="text-sm text-foreground mt-0.5">{p.address}</p>
        {/* Beds / Baths / Sqft */}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          {p.beds   !== undefined && <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{p.beds}</span>}
          {p.baths  !== undefined && <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{p.baths}</span>}
          {p.sqft   !== undefined && <span className="flex items-center gap-1 font-medium text-foreground"><Maximize2 className="h-4 w-4" />{p.sqft.toLocaleString()} sqft</span>}
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ p, index }: { p: any; index: number }) {
  // Format date and time in IST
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date: dateStr, time: timeStr };
  };

  const createdAt = formatDateTime(p.createdAt);
  const updatedAt = formatDateTime(p.updatedAt);

  // Format price
  const formatPrice = (price: number | string) => {
    if (typeof price === 'string') return price; // Already formatted range like "3000 - 8000"
    if (!price) return '-';
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button disabled className="p-1.5 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed">
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      
      {/* # (Index) */}
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {index + 1}
      </td>
      
      {/* Image */}
      <td className="px-4 py-3">
        <img 
          src={p.media?.images?.[0] || '/placeholder.png'} 
          alt="Property" 
          className="h-12 w-16 rounded-lg object-cover shrink-0" 
        />
      </td>
      
      {/* Listing Type */}
      <td className="px-4 py-3">
        <span className="text-sm text-foreground">{p.listingType?.name || '-'}</span>
      </td>
      
      {/* Category */}
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.category?.name || '-'}</td>
      
      {/* Property Type */}
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.propertyType?.name || '-'}</td>
      
      {/* City */}
      <td className="px-4 py-3 text-sm text-foreground">{p.cityName || '-'}</td>
      
      {/* Locality */}
      <td className="px-4 py-3 text-sm text-muted-foreground">{p.locality?.address || '-'}</td>
      
      {/* Sales Price */}
      <td className="px-4 py-3 text-sm font-semibold text-foreground">
        {p.sellInfo?.price ? formatPrice(p.sellInfo.price) : '-'}
      </td>
      
      {/* Rent Price */}
      <td className="px-4 py-3 text-sm font-semibold text-foreground">
        {p.rentInfo?.monthlyRent ? formatPrice(p.rentInfo.monthlyRent) : (p.price && typeof p.price === 'string' ? p.price : p.price ? formatPrice(p.price) : '-')}
      </td>
      
      {/* Status */}
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status] || 'bg-gray-100 text-gray-600'}`}>
          {p.status}
        </span>
      </td>
      
      {/* Listed By */}
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-foreground">{p.listedBy?.name || '-'}</p>
        <p className="text-muted-foreground mt-0.5">{p.listedBy?.mobile || '-'}</p>
        <p className="text-muted-foreground">({p.listedBy?.role?.name || 'N/A'})</p>
      </td>
      
      {/* Created At */}
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-foreground">{createdAt.date}</p>
        <p className="text-muted-foreground">{createdAt.time}</p>
      </td>
      
      {/* Updated At */}
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-foreground">{updatedAt.date}</p>
        <p className="text-muted-foreground">{updatedAt.time}</p>
      </td>
    </tr>
  );
}

export default function PropertiesPage({ filterType, listedByType: lockedListedByType, listedByName }: { filterType?: string; listedByType?: string; listedByName?: string }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const resolvedListedByType = lockedListedByType ?? state?.listedByType;
  const resolvedListedByName = listedByName ?? state?.listedByName;

  const [search, setSearch] = useState(resolvedListedByName ?? "");
  const [view, setView] = useState<"grid" | "list" | "map">("list");

  // ── Filter option lists from API ────────────────────────────────────────────
  const [purposes, setPurposes]         = useState<FilterOption[]>([]);
  const [categories, setCategories]     = useState<FilterOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<FilterOption[]>([]);

  // ── Applied filters (sent to API on every fetch) ────────────────────────────
  const [purposeFilter, setPurposeFilter]   = useState("");  // _id
  const [categoryFilter, setCategoryFilter] = useState("");  // _id
  const [typeFilter, setTypeFilter]         = useState("");  // _id
  const [statusFilter, setStatusFilter]     = useState("");  // enum string
  const [listedByFilter, setListedByFilter] = useState(resolvedListedByType ?? "All");

  // ── Pending filters (staged until Apply is clicked) ─────────────────────────
  const [pendingPurpose,   setPendingPurpose]   = useState("");
  const [pendingCategory,  setPendingCategory]  = useState("");
  const [pendingType,      setPendingType]      = useState("");
  const [pendingStatus,    setPendingStatus]    = useState("");

  // ── Listings API state ──────────────────────────────────────────────────────
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, Active: 0, Inactive: 0, Sold: 0, Rented: 0, UnderReview: 0, Rejected: 0 });
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  // ── 1. Fetch purposes + categories on mount ─────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [purRes, catRes] = await Promise.all([
          api.get('/admin/property-purposes'),
          api.get('/admin/property-categories'),
        ]);
        if (purRes.data.success) setPurposes(purRes.data.data);
        if (catRes.data.success) setCategories(catRes.data.data);
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    load();
  }, []);

  // ── 2. Fetch property types whenever applied category changes ───────────────
  useEffect(() => {
    const load = async () => {
      try {
        const params = categoryFilter ? `?propertyCategory=${categoryFilter}` : '';
        const res = await api.get(`/admin/property-types${params}`);
        if (res.data.success) setPropertyTypes(res.data.data);
      } catch (err) {
        console.error('Failed to fetch property types:', err);
      }
    };
    load();
    // When category changes, clear any pending/applied type that may no longer belong
    setPendingType("");
    setTypeFilter("");
  }, [categoryFilter]);

  // ── 3. Fetch listings whenever applied filters or pagination change ──────────
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page:  pagination.page.toString(),
          limit: pagination.limit.toString(),
        });

        if (search)         params.append('search',     search);
        if (statusFilter)   params.append('status',     statusFilter);
        if (categoryFilter) params.append('categoryId', categoryFilter);
        if (typeFilter)     params.append('typeId',     typeFilter);
        // purposeFilter selects the route rather than being a query param
        // (backend already filters by listingType.id via the route)

        let route = '/admin/property-listings';
        if (purposeFilter) {
          const match = purposes.find(p => p._id === purposeFilter);
          if (match) {
            const n = match.name.toLowerCase();
            if      (n.includes('sell'))                          route = '/admin/property-listings/for-sell';
            else if (n.includes('rent'))                          route = '/admin/property-listings/for-rent';
            else if (n.includes('pg') || n.includes('co-living')) route = '/admin/property-listings/for-pg';
          }
        }

        const response = await api.get(`${route}?${params.toString()}`);
        if (response.data.success) {
          setProperties(response.data.data.properties);
          setStats(response.data.data.stats);
          setPagination(prev => ({ ...prev, ...response.data.pagination }));
        }
      } catch (err) {
        console.error('Failed to fetch properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [pagination.page, pagination.limit, search, purposeFilter, categoryFilter, typeFilter, statusFilter, purposes]);

  const hasFilters = purposeFilter !== "" || categoryFilter !== "" || typeFilter !== "" || statusFilter !== "" || listedByFilter !== "All" || search !== "";

  function applyFilters() {
    setPurposeFilter(pendingPurpose);
    setCategoryFilter(pendingCategory);
    setTypeFilter(pendingType);
    setStatusFilter(pendingStatus);
    setPagination(prev => ({ ...prev, page: 1 }));
  }

  function clearAll() {
    setPendingPurpose(""); setPendingCategory(""); setPendingType(""); setPendingStatus("");
    setPurposeFilter(""); setCategoryFilter(""); setTypeFilter(""); setStatusFilter("");
    setListedByFilter("All"); setSearch("");
    setPagination(prev => ({ ...prev, page: 1 }));
  }

  const tableRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      
      if (scrollingRef.current) return; // Prevent multiple simultaneous scrolls
      
      const scrollAmount = e.key === "ArrowLeft" ? -200 : 200;
      const element = tableRef.current;
      if (!element) return;
      
      scrollingRef.current = true;
      const start = element.scrollLeft;
      const target = start + scrollAmount;
      const duration = 300; // milliseconds
      const startTime = performance.now();
      
      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        element.scrollLeft = start + (target - start) * easeProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          scrollingRef.current = false;
        }
      }
      
      requestAnimationFrame(animate);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {filterType ? `${filterType} Properties` : "Properties"}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4 col-span-1">
          <p className="text-xs text-muted-foreground">Total Properties</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-yellow-50 p-4">
          <p className="text-xs text-yellow-600">Under Review</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.UnderReview}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-4">
          <p className="text-xs text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.Active}</p>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Sold</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.Sold}</p>
        </div>
        <div className="rounded-xl border bg-teal-50 p-4">
          <p className="text-xs text-teal-600">Rented</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{stats.Rented}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border bg-slate-100 p-4">
          <p className="text-xs text-slate-500">Inactive</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{stats.Inactive}</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4">
          <p className="text-xs text-red-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.Rejected}</p>
        </div>
      </div>

      {/* Toolbar - Row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pagination.limit)}
            onValueChange={(v) => setPagination(prev => ({ ...prev, limit: Number(v), page: 1 }))}
          >
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{pagination.total} propert{pagination.total !== 1 ? 'ies' : 'y'}</p>

        <div className="flex-1" />

        {/* Purpose filter — hidden when a filterType is locked in */}
        {!filterType && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
                {pendingPurpose ? (purposes.find(p => p._id === pendingPurpose)?.name ?? "All Purposes") : "All Purposes"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPendingPurpose("")}>All Purposes</DropdownMenuItem>
              {purposes.map((p) => (
                <DropdownMenuItem key={p._id} onClick={() => setPendingPurpose(p._id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pendingCategory ? (categories.find(c => c._id === pendingCategory)?.name ?? "All Categories") : "All Categories"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setPendingCategory(""); setPendingType(""); }}>All Categories</DropdownMenuItem>
            {categories.map((c) => (
              <DropdownMenuItem key={c._id} onClick={() => { setPendingCategory(c._id); setPendingType(""); }}>
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type filter — options are fetched from API based on applied categoryFilter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pendingType ? (propertyTypes.find(t => t._id === pendingType)?.name ?? "All Types") : "All Types"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPendingType("")}>All Types</DropdownMenuItem>
            {propertyTypes.map((t) => (
              <DropdownMenuItem key={t._id} onClick={() => setPendingType(t._id)}>
                {t.name}
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
          <button onClick={() => setView("map")}
            className={`p-1.5 rounded-md transition-colors ${view === "map" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}>
            <Map className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar - Row 2 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1" />

        {/* Listed By filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
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

        {/* Status filter — values from model enum */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pendingStatus || "All Statuses"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPendingStatus("")}>All Statuses</DropdownMenuItem>
            {LISTING_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setPendingStatus(s)}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="h-9" onClick={applyFilters}>Apply</Button>

        {hasFilters && (
          <button onClick={clearAll} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors ml-1 underline underline-offset-2">Clear all</button>
        )}
      </div>

      {/* List view */}
      {!loading && view === "list" && (
        <div className="rounded-lg border bg-card overflow-x-auto" ref={tableRef} tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: "none" }}>
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Image</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listing Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Locality</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sales Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rent Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listed By</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created At</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated At</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0
                ? <tr><td colSpan={14} className="text-center text-muted-foreground py-16">No properties found</td></tr>
                : properties.map((p, index) => (
                  <PropertyRow key={p._id} p={p} index={index + ((pagination.page - 1) * pagination.limit)} />
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Loading view */}
      {loading && view === "list" && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Image</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listing Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Locality</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sales Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rent Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listed By</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created At</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated At</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={14} className="py-16"><Spinner fullPage={false} size="md" label="Loading properties..." /></td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={pagination.page === 1} 
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0} 
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
