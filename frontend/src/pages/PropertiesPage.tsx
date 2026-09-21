import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "@/lib/axiosInterceptor";
import { systemUsersService, type ActiveUser } from "@/services/systemUsersService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown, LayoutGrid, List, Map,
  Bed, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { type ListingStatus } from "@/data/propertiesData";
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

function PropertyCard({ p, onClick }: { p: any; onClick: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = p.media?.images ?? [];
  const total = images.length;
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + total) % total); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % total); };

  const formatPrice = (price: number | string) => {
    if (typeof price === "string") return price;
    if (!price) return null;
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (price >= 100000)   return `₹${(price / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const displayPrice = p.sellInfo?.price
    ? formatPrice(p.sellInfo.price)
    : p.rentInfo?.monthlyRent
    ? `${formatPrice(p.rentInfo.monthlyRent)}/mo`
    : p.price
    ? (typeof p.price === "string" ? p.price : formatPrice(p.price))
    : "Price on request";

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-[9px] pb-0">
        <div className="relative h-48 overflow-hidden rounded-lg">
          {images.length > 0 ? (
            <img src={images[imgIdx]} alt="Property" className="w-full h-full object-cover transition-opacity duration-300" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No image</div>
          )}
          {/* Top-right actions */}
          <div className="absolute top-3 right-3 flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-1.5 rounded-full bg-white/90 hover:bg-green-50 text-green-600 transition-colors">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Status badge */}
          <div className="absolute bottom-2 left-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[p.status] ?? "bg-gray-100 text-gray-600"}`}>{p.status}</span>
          </div>
          {/* Image nav dots */}
          {total > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_: any, i: number) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-3 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          )}
          {/* Prev/Next */}
          {total > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/30 text-white hover:bg-black/50">
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/30 text-white hover:bg-black/50">
                <ChevronRight className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-base font-bold text-foreground">{displayPrice}</p>
        <div className="flex items-center gap-1 flex-wrap">
          {p.listingType?.name && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${purposeStyle[p.listingType.name] ?? "bg-muted text-muted-foreground"}`}>
              {p.listingType.name}
            </span>
          )}
          {p.category?.name && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {p.category.name}
            </span>
          )}
          {p.propertyType?.name && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
              {p.propertyType.name}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground truncate">{p.locality?.address ?? p.cityName ?? "—"}</p>
        {p.listedBy?.name && (
          <p className="text-xs text-muted-foreground">By {p.listedBy.name} ({p.listedBy?.role?.name ?? "—"})</p>
        )}
        {p.residentialDetails?.bhk && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Bed className="h-3 w-3" />{p.residentialDetails.bhk} BHK
          </p>
        )}
      </div>
    </div>
  );
}

function PropertyRow({ p, index, onView }: { p: any; index: number; onView: (id: string) => void }) {
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
          <button onClick={() => onView(p._id)} className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
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
        {p.sellPrice ? formatPrice(p.sellPrice) : '-'}
      </td>

      {/* Rent Price */}
      <td className="px-4 py-3 text-sm font-semibold text-foreground">
        {p.rentPrice
          ? formatPrice(p.rentPrice)
          : p.pgPrice != null
          ? (typeof p.pgPrice === 'string' ? `₹${p.pgPrice}` : formatPrice(p.pgPrice))
          : '-'}
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
  const [searchParams, setSearchParams] = useSearchParams();

  const resolvedListedByType = lockedListedByType ?? state?.listedByType;
  const resolvedListedByName = listedByName ?? state?.listedByName;

  // ── View toggle (not persisted in URL) ─────────────────────────────────────
  const [view, setView] = useState<"grid" | "list" | "map">("list");

  // ── Filter option lists from API ────────────────────────────────────────────
  const [purposes, setPurposes]           = useState<FilterOption[]>([]);
  const [categories, setCategories]       = useState<FilterOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<FilterOption[]>([]);
  const [roles, setRoles]                 = useState<FilterOption[]>([]);
  const [activeUsers, setActiveUsers]     = useState<ActiveUser[]>([]);

  // ── Applied filters — read directly from URL search params ─────────────────
  const purposeFilter   = searchParams.get("purposeId")  ?? "";
  const categoryFilter  = searchParams.get("categoryId") ?? "";
  const typeFilter      = searchParams.get("typeId")     ?? "";
  const statusFilter    = searchParams.get("status")     ?? "";
  const roleIdFilter    = searchParams.get("roleId")     ?? "";
  const userIdFilter    = searchParams.get("userId")     ?? "";
  const cityFilter      = searchParams.get("city")       ?? "";
  const search          = searchParams.get("search")     ?? (resolvedListedByName ?? "");
  const currentPage     = Number(searchParams.get("page")  ?? "1");
  const currentLimit    = Number(searchParams.get("limit") ?? "10");

  // ── Pending filters (staged in local state until Apply) ─────────────────────
  const [pendingPurpose,  setPendingPurpose]  = useState(purposeFilter);
  const [pendingCategory, setPendingCategory] = useState(categoryFilter);
  const [pendingType,     setPendingType]     = useState(typeFilter);
  const [pendingStatus,   setPendingStatus]   = useState(statusFilter);
  const [pendingRoleId,   setPendingRoleId]   = useState(roleIdFilter);
  const [pendingUserId,   setPendingUserId]   = useState(userIdFilter);
  const [pendingCity,     setPendingCity]     = useState(cityFilter);
  const [pendingSearch,   setPendingSearch]   = useState(search);
  const [userSearch,      setUserSearch]      = useState("");
  const [listedByFilter,  setListedByFilter]  = useState(resolvedListedByType ?? "All");

  // ── Listings API state ──────────────────────────────────────────────────────
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, Active: 0, Inactive: 0, Sold: 0, Rented: 0, UnderReview: 0, Rejected: 0 });
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: currentPage, limit: currentLimit, totalPages: 0 });

  // ── Helper: update URL params ───────────────────────────────────────────────
  const updateParams = (updates: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      return next;
    }, { replace: true });
  };

  // ── 1. Fetch purposes + categories + roles on mount ─────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [purRes, catRes, rolesRes] = await Promise.all([
          api.get('/admin/property-purposes'),
          api.get('/admin/property-categories'),
          api.get('/admin/property-listings/listing-user-roles'),
        ]);
        if (purRes.data.success)   setPurposes(purRes.data.data);
        if (catRes.data.success)   setCategories(catRes.data.data);
        if (rolesRes.data.success) setRoles(rolesRes.data.data);
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    load();
  }, []);

  // ── Debounced user search ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userSearch.trim()) {
      systemUsersService.getActiveUsers()
        .then((res) => { if (res.data.success) setActiveUsers(res.data.data); })
        .catch(() => {});
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await systemUsersService.getActiveUsers({ search: userSearch.trim() });
        if (res.data.success) setActiveUsers(res.data.data);
      } catch (err) {
        console.error('Failed to search users:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

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
  }, [categoryFilter]);

  // ── 3. Fetch listings whenever URL params (filters/pagination) change ───────
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page:  String(currentPage),
          limit: String(currentLimit),
        });

        if (search)         params.append('search',     search);
        if (statusFilter)   params.append('status',     statusFilter);
        if (categoryFilter) params.append('categoryId', categoryFilter);
        if (typeFilter)     params.append('typeId',     typeFilter);
        if (purposeFilter)  params.append('purposeId',  purposeFilter);
        if (roleIdFilter)   params.append('roleId',     roleIdFilter);
        if (userIdFilter)   params.append('userId',     userIdFilter);
        if (cityFilter)     params.append('city',       cityFilter);

        const response = await api.get(`/admin/property-listings?${params.toString()}`);
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
  }, [currentPage, currentLimit, search, purposeFilter, categoryFilter, typeFilter, statusFilter, roleIdFilter, userIdFilter, cityFilter]);

  const hasFilters = purposeFilter !== "" || categoryFilter !== "" || typeFilter !== "" || statusFilter !== "" || listedByFilter !== "All" || search !== "" || roleIdFilter !== "" || userIdFilter !== "" || cityFilter !== "";

  function applyFilters() {
    updateParams({
      purposeId:  pendingPurpose,
      categoryId: pendingCategory,
      typeId:     pendingType,
      status:     pendingStatus,
      roleId:     pendingRoleId,
      userId:     pendingUserId,
      city:       pendingCity,
      search:     pendingSearch,
      page:       "1",
    });
  }

  function clearAll() {
    setPendingPurpose(""); setPendingCategory(""); setPendingType(""); setPendingStatus("");
    setPendingRoleId(""); setPendingUserId(""); setPendingCity(""); setPendingSearch("");
    setListedByFilter("All");
    setSearchParams({}, { replace: true });
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
          {filterType ? `${filterType} Properties` : "All Properties"}
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
            value={String(currentLimit)}
            onValueChange={(v) => updateParams({ limit: v, page: "1" })}
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

        {/* City filter */}
        <input
          value={pendingCity}
          onChange={(e) => setPendingCity(e.target.value)}
          placeholder="Filter by city..."
          className="h-9 w-40 rounded-md border px-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
        />

        {/* Role filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pendingRoleId ? (roles.find(r => r._id === pendingRoleId)?.name ?? "All Roles") : "All Roles"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setPendingRoleId(""); setPendingUserId(""); }}>All Roles</DropdownMenuItem>
            {roles.map((r) => (
              <DropdownMenuItem key={r._id} onClick={() => { setPendingRoleId(r._id); setPendingUserId(""); }}>
                {r.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User filter */}
        <DropdownMenu onOpenChange={(open) => { if (!open) setUserSearch(""); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pendingUserId ? (activeUsers.find(u => u._id === pendingUserId)?.name ?? activeUsers.find(u => u._id === pendingUserId)?.mobile ?? "All Users") : "All Users"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5">
              <input
                autoFocus
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search by name..."
                className="w-full rounded-md border px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <DropdownMenuItem onClick={() => setPendingUserId("")}>All Users</DropdownMenuItem>
            {activeUsers.map((u) => (
              <DropdownMenuItem key={u._id} onClick={() => setPendingUserId(u._id)}>
                {u.name ?? u.mobile} — {u.roleName}
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
                  <PropertyRow key={p._id} p={p} index={index + ((pagination.page - 1) * pagination.limit)} onView={(id) => navigate(`/properties/${id}`)} />
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

      {/* Grid view */}
      {!loading && view === "grid" && (
        properties.length === 0
          ? <div className="text-center text-muted-foreground py-16">No properties found</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {properties.map((p) => (
                <PropertyCard key={p._id} p={p} onClick={() => navigate(`/properties/${p._id}`)} />
              ))}
            </div>
      )}

      {/* Grid loading */}
      {loading && view === "grid" && (
        <div className="flex items-center justify-center py-16">
          <Spinner fullPage={false} size="md" label="Loading properties..." />
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
            disabled={currentPage === 1}
            onClick={() => updateParams({ page: String(currentPage - 1) })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pagination.totalPages || pagination.totalPages === 0}
            onClick={() => updateParams({ page: String(currentPage + 1) })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
