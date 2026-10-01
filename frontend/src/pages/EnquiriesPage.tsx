import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, CalendarDays, CheckCircle2, Clock3, Flame, Sun, Snowflake, Eye, Ban } from "lucide-react";
import { inquiriesService, type AdminInquiry, type AdminInquiryFilters } from "@/services/inquiriesService";
import api from "@/lib/axiosInterceptor";
import { systemUsersService, type ActiveUser } from "@/services/systemUsersService";
import Spinner from "@/components/Spinner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FilterOption { _id: string; name: string; }

function toDateInputValue(date?: Date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatRangeDate(date?: Date) {
  return date?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const LIMITS = [10, 20, 50, 100];

const classificationStyle: Record<AdminInquiry["inquiryClassification"], string> = {
  hot: "bg-red-50 text-red-600",
  warm: "bg-amber-50 text-amber-700",
  cold: "bg-sky-50 text-sky-700",
};

const inquiryStatusLabel: Record<AdminInquiry["status"], string> = {
  active: "Active",
  expired: "Expired",
  inactive: "Inactive",
  completed: "Completed",
};

const inquiryStatusStyle: Record<AdminInquiry["status"], string> = {
  active: "bg-green-50 text-green-700",
  expired: "bg-slate-100 text-slate-600",
  inactive: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
};

function formatBudget(min: number, max: number) {
  const format = (amount: number) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
  return `${format(min)} – ${format(max)}`;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function referenceName(reference?: { name: string } | null) {
  return reference?.name ?? "—";
}

interface Query {
  page: number;
  limit: number;
  status: string;
  classification: string;
  isProperty: string;
  purposeId: string;
  categoryId: string;
  propertyTypeId: string;
  roleId: string;
  userId: string;
  search: string;
  fromDate: string;
  toDate: string;
}

const DEFAULT_QUERY: Query = {
  page: 1, limit: 10,
  status: "", classification: "", isProperty: "",
  purposeId: "", categoryId: "", propertyTypeId: "",
  roleId: "", userId: "", search: "", fromDate: "", toDate: "",
};

function queryFromSearchParams(params: URLSearchParams): Query {
  const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
  const parsedLimit = Number.parseInt(params.get("limit") ?? "10", 10);
  const limit = LIMITS.includes(parsedLimit) ? parsedLimit : DEFAULT_QUERY.limit;

  return {
    ...DEFAULT_QUERY,
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit,
    status: params.get("status") ?? "",
    classification: params.get("classification") ?? "",
    isProperty: params.get("isProperty") ?? "",
    purposeId: params.get("purposeId") ?? "",
    categoryId: params.get("categoryId") ?? "",
    propertyTypeId: params.get("typeId") ?? "",
    roleId: params.get("roleId") ?? "",
    userId: params.get("userId") ?? "",
    search: params.get("search") ?? "",
    fromDate: params.get("fromDate") ?? "",
    toDate: params.get("toDate") ?? "",
  };
}

function searchParamsFromQuery(query: Query) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  const values: Array<[string, string]> = [
    ["status", query.status],
    ["classification", query.classification],
    ["isProperty", query.isProperty],
    ["purposeId", query.purposeId],
    ["categoryId", query.categoryId],
    ["typeId", query.propertyTypeId],
    ["roleId", query.roleId],
    ["userId", query.userId],
    ["search", query.search.trim()],
    ["fromDate", query.fromDate],
    ["toDate", query.toDate],
  ];
  values.forEach(([key, value]) => { if (value) params.set(key, value); });
  return params;
}

export default function EnquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState<Query>(() => queryFromSearchParams(searchParams));
  const [pending, setPending] = useState<Query>(query);
  const [enquiries, setEnquiries] = useState<AdminInquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({ active: 0, expired: 0, inactive: 0, completed: 0, hot: 0, warm: 0, cold: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [statusConfirmation, setStatusConfirmation] = useState<{ inquiryId: string; status: "inactive" | "completed" } | null>(null);

  // Filter option lists
  const [purposes, setPurposes]           = useState<FilterOption[]>([]);
  const [categories, setCategories]       = useState<FilterOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<FilterOption[]>([]);
  const [roles, setRoles]                 = useState<FilterOption[]>([]);
  const [activeUsers, setActiveUsers]     = useState<ActiveUser[]>([]);
  const [userSearch, setUserSearch]       = useState("");

  // Fetch inquiry filter options.
  useEffect(() => {
    Promise.all([
      api.get("/admin/property-purposes?isActive=true"),
      api.get("/admin/property-categories?isActive=true"),
      api.get("/admin/inquiries/roles"),
    ]).then(([purRes, catRes, rolesRes]) => {
      if (purRes.data.success)   setPurposes(purRes.data.data);
      if (catRes.data.success)   setCategories(catRes.data.data);
      if (rolesRes.data.success) setRoles(rolesRes.data.data);
    }).catch(() => {});
  }, []);

  // Fetch property types whenever pending category changes
  useEffect(() => {
    const params = new URLSearchParams({ isActive: "true" });
    if (pending.categoryId) params.set("propertyCategory", pending.categoryId);
    api.get(`/admin/property-types?${params.toString()}`)
      .then((res) => { if (res.data.success) setPropertyTypes(res.data.data); })
      .catch(() => {});
  }, [pending.categoryId]);

  // Fetch active users (with debounced search)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = userSearch.trim() ? { search: userSearch.trim() } : undefined;
      systemUsersService.getActiveUsers(params)
        .then((res) => { if (res.data.success) setActiveUsers(res.data.data); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const hasFilters = Boolean(
    query.status || query.classification || query.isProperty || query.purposeId ||
    query.categoryId || query.propertyTypeId || query.roleId || query.userId || query.search
    || query.fromDate || query.toDate
  );

  const updateStatus = async (inquiryId: string, status: "inactive" | "completed") => {
    setStatusUpdatingId(inquiryId);
    setStatusUpdateError("");
    try {
      await inquiriesService.updateStatus({ inquiryId, status });
      setQuery((current) => ({ ...current, page: 1 }));
      return true;
    } catch {
      setStatusUpdateError("Could not update the enquiry status. Please try again.");
      return false;
    } finally {
      setStatusUpdatingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const params: AdminInquiryFilters = { page: query.page, limit: query.limit };
    if (query.status)         params.status         = query.status;
    if (query.classification) params.classification = query.classification;
    if (query.isProperty)     params.isProperty     = query.isProperty;
    if (query.purposeId)      params.purposeId      = query.purposeId;
    if (query.categoryId)     params.categoryId     = query.categoryId;
    if (query.propertyTypeId) params.typeId         = query.propertyTypeId;
    if (query.roleId)         params.roleId         = query.roleId;
    if (query.userId)         params.userId         = query.userId;
    if (query.search.trim())  params.search         = query.search.trim();
    if (query.fromDate)       params.fromDate       = query.fromDate;
    if (query.toDate)         params.toDate         = query.toDate;

    inquiriesService.getAll(params)
      .then(({ data }) => {
        if (cancelled) return;
        setEnquiries(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setStats(data.stats);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load enquiries. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [query]);

  function set(key: keyof Query, v: string) {
    const value = v === "all" ? "" : v;
    setPending((p) => ({
      ...p,
      [key]: value,
      ...(key === "categoryId" ? { propertyTypeId: "" } : {}),
      ...(key === "roleId" ? { userId: "" } : {}),
    }));
  }

  function applyFilters() {
    setQuery({ ...pending, page: 1 });
  }

  function clearFilters() {
    setPending(DEFAULT_QUERY);
    setQuery(DEFAULT_QUERY);
  }

  function goToPage(p: number) {
    setQuery((q) => ({ ...q, page: p }));
  }

  const selectedFromDate = fromDateInputValue(pending.fromDate);
  const selectedToDate = fromDateInputValue(pending.toDate);

  // Keep the applied filters and pagination in the URL for refresh and detail-page return navigation.
  useEffect(() => {
    const nextParams = searchParamsFromQuery(query);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [query, searchParams, setSearchParams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Enquiries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All enquiries submitted by users.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold text-green-600">{stats.active.toLocaleString()}</p></div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Clock3 className="h-5 w-5 text-slate-600" /></div>
          <div><p className="text-xs text-muted-foreground">Expired</p><p className="text-xl font-bold text-slate-600">{stats.expired.toLocaleString()}</p></div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100"><Clock3 className="h-5 w-5 text-amber-700" /></div>
          <div><p className="text-xs text-muted-foreground">Inactive</p><p className="text-xl font-bold text-amber-700">{stats.inactive.toLocaleString()}</p></div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-5 w-5 text-emerald-700" /></div>
          <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold text-emerald-700">{stats.completed.toLocaleString()}</p></div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"><Flame className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Hot</p><p className="text-xl font-bold text-red-600">{stats.hot.toLocaleString()}</p></div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100"><Sun className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Warm</p><p className="text-xl font-bold text-amber-600">{stats.warm.toLocaleString()}</p></div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100"><Snowflake className="h-5 w-5 text-sky-600" /></div>
          <div><p className="text-xs text-muted-foreground">Cold</p><p className="text-xl font-bold text-sky-600">{stats.cold.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground font-medium">Created:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={pending.fromDate ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[140px] justify-start">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatRangeDate(selectedFromDate) ?? "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedFromDate}
              disabled={selectedToDate ? { after: selectedToDate } : undefined}
              onSelect={(date) => setPending((current) => ({ ...current, fromDate: toDateInputValue(date) }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={pending.toDate ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[140px] justify-start">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatRangeDate(selectedToDate) ?? "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedToDate}
              disabled={selectedFromDate ? { before: selectedFromDate } : undefined}
              onSelect={(date) => setPending((current) => ({ ...current, toDate: toDateInputValue(date) }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
      {/* Toolbar — first row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(query.limit)} onValueChange={(v) => {
            const limit = Number(v);
            setQuery((q) => ({ ...q, page: 1, limit }));
            setPending((p) => ({ ...p, limit }));
          }}>
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LIMITS.map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{total} enquir{total !== 1 ? "ies" : "y"}</p>
        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.purposeId ? (purposes.find((p) => p._id === pending.purposeId)?.name ?? "All Purposes") : "All Purposes"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("purposeId", "all")}>All Purposes</DropdownMenuItem>
            {purposes.map((option) => <DropdownMenuItem key={option._id} onClick={() => set("purposeId", option._id)}>{option.name}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.categoryId ? (categories.find((c) => c._id === pending.categoryId)?.name ?? "All Categories") : "All Categories"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("categoryId", "all")}>All Categories</DropdownMenuItem>
            {categories.map((option) => <DropdownMenuItem key={option._id} onClick={() => set("categoryId", option._id)}>{option.name}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.propertyTypeId ? (propertyTypes.find((t) => t._id === pending.propertyTypeId)?.name ?? "All Types") : "All Types"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("propertyTypeId", "all")}>All Types</DropdownMenuItem>
            {propertyTypes.map((option) => <DropdownMenuItem key={option._id} onClick={() => set("propertyTypeId", option._id)}>{option.name}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.classification ? `${pending.classification[0].toUpperCase()}${pending.classification.slice(1)}` : "All Classifications"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("classification", "all")}>All Classifications</DropdownMenuItem>
            {(["hot", "warm", "cold"] as const).map((value) => (
              <DropdownMenuItem key={value} onClick={() => set("classification", value)}>{value[0].toUpperCase()}{value.slice(1)}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Toolbar — second row */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={pending.search}
          onChange={(event) => set("search", event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") applyFilters(); }}
          placeholder="Search by city or area..."
          aria-label="Search enquiries by city or area"
          className="h-9 w-64 rounded-md border bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.status ? inquiryStatusLabel[pending.status as AdminInquiry["status"]] ?? "Status" : "All Statuses"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("status", "all")}>All Statuses</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set("status", "active")}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set("status", "inactive")}>Inactive</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set("status", "completed")}>Completed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set("status", "expired")}>Expired</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.isProperty ? (pending.isProperty === "true" ? "Individual Property" : "Project") : "All Enquiry Types"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("isProperty", "all")}>All Enquiry Types</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set("isProperty", "true")}>Individual Property</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set("isProperty", "false")}>Project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.roleId ? (roles.find((r) => r._id === pending.roleId)?.name ?? "All Roles") : "All Roles"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => set("roleId", "all")}>All Roles</DropdownMenuItem>
            {roles.map((option) => <DropdownMenuItem key={option._id} onClick={() => set("roleId", option._id)}>{option.name}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu onOpenChange={(open) => { if (!open) setUserSearch(""); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              {pending.userId
                ? (activeUsers.find((u) => u._id === pending.userId)?.name ?? activeUsers.find((u) => u._id === pending.userId)?.mobile ?? "Selected User")
                : "All Users"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5">
              <input
                autoFocus
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                placeholder="Search by name..."
                className="w-full rounded-md border px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <DropdownMenuItem onClick={() => set("userId", "all")}>All Users</DropdownMenuItem>
            {activeUsers.map((user) => (
              <DropdownMenuItem key={user._id} onClick={() => set("userId", user._id)}>
                {user.name ?? user.mobile} — {user.roleName ?? ""}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="h-9" onClick={applyFilters}>Apply</Button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 font-medium transition-colors underline underline-offset-2">
            Clear all
          </button>
        )}
      </div>

      </div>


      <div className="rounded-lg border bg-card overflow-x-auto">
        {statusUpdateError && <p className="px-4 py-2 text-sm text-destructive">{statusUpdateError}</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Created At</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Created By</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Total Assigned</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Total Purchased</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Classification</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Enquiry Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Purpose</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Property Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">City / Area</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Budget</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">BHK</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Built Up Area</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Plot Area</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Furnishing</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Communication</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Last Follow Up Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={22} className="py-16"><Spinner fullPage={false} size="md" label="Loading enquiries..." /></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={22} className="py-16 text-center">
                  <p className="mb-3 text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => setQuery((q) => ({ ...q }))}>Retry</Button>
                </td>
              </tr>
            ) : enquiries.length === 0 ? (
              <tr><td colSpan={22} className="py-16 text-center text-muted-foreground">No enquiries found</td></tr>
            ) : enquiries.map((enquiry, index) => (
              <tr key={enquiry._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/view-assigned-enquiries/${enquiry._id}`, {
                      state: { returnTo: `${location.pathname}${location.search}` },
                    })}
                    className="rounded-md bg-green-50 p-1.5 text-green-600 transition-colors hover:bg-green-100"
                    title="View assigned enquiries"
                    aria-label="View assigned enquiries"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {enquiry.status === "active" && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setStatusUpdateError(""); setStatusConfirmation({ inquiryId: enquiry._id, status: "inactive" }); }}
                        disabled={statusUpdatingId === enquiry._id}
                        className="rounded-md bg-amber-50 p-1.5 text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                        title="Mark inactive"
                        aria-label="Mark inquiry inactive"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStatusUpdateError(""); setStatusConfirmation({ inquiryId: enquiry._id, status: "completed" }); }}
                        disabled={statusUpdatingId === enquiry._id}
                        className="rounded-md bg-emerald-50 p-1.5 text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                        title="Mark completed"
                        aria-label="Mark inquiry completed"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  </div>
                </td>
                {/* # */}
                <td className="px-4 py-3 text-muted-foreground">{(query.page - 1) * query.limit + index + 1}</td>
                {/* Created At — date and time in Asia/Kolkata */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p>{new Date(enquiry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>
                  <p className="text-muted-foreground">{new Date(enquiry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</p>
                </td>
                {/* Created By — name + mobile below, no avatar */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-medium text-foreground">{enquiry.createdBy?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{enquiry.createdBy?.mobile ?? "—"}</p>
                </td>
                {/* Role */}
                <td className="px-4 py-3 text-muted-foreground capitalize whitespace-nowrap">{enquiry.createdBy?.role?.name ?? "—"}</td>
                {/* Assignment totals */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{enquiry.totalAssigned.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{enquiry.totalPurchased.toLocaleString()}</td>
                {/* Classification */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${classificationStyle[enquiry.inquiryClassification]}`}>
                    {enquiry.inquiryClassification}
                  </span>
                </td>
                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${inquiryStatusStyle[enquiry.status]}`}>
                    {enquiry.status}
                  </span>
                </td>
                {/* Enquiry Type */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {enquiry.isProperty ? "Individual Property" : "Project"}
                </td>
                {/* Purpose */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{referenceName(enquiry.listingType)}</td>
                {/* Category */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{referenceName(enquiry.propertyCategory)}</td>
                {/* Property Type */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{referenceName(enquiry.propertyType)}</td>
                {/* City / Area */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-foreground">{enquiry.preferredCity}</p>
                  <p className="text-xs text-muted-foreground">{enquiry.preferredArea || "—"}</p>
                </td>
                {/* Budget */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatBudget(enquiry.budget.min, enquiry.budget.max)}</td>
                {/* BHK */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {enquiry.bhk != null ? enquiry.bhk : "—"}
                </td>
                {/* Built Up Area */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {enquiry.builtUpArea?.value != null ? `${enquiry.builtUpArea.value} ${enquiry.builtUpArea.unit ?? ""}`.trim() : "—"}
                </td>
                {/* Plot Area */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {enquiry.plotArea?.value != null ? `${enquiry.plotArea.value} ${enquiry.plotArea.unit ?? ""}`.trim() : "—"}
                </td>
                {/* Furnishing */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{enquiry.furnishingType ?? "—"}</td>
                {/* Preferred Communication */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {enquiry.preferredCommunication?.length ? enquiry.preferredCommunication.join(", ") : "—"}
                </td>
                {/* Last Follow Up Date */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(enquiry.lastFollowUpDate)}</td>
                {/* Remarks */}
                <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate" title={enquiry.remarks ?? ""}>
                  {enquiry.remarks || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Page {query.page} of {Math.max(1, totalPages)}</span>
        <Button variant="outline" size="sm" onClick={() => goToPage(query.page - 1)} disabled={loading || query.page <= 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => goToPage(query.page + 1)} disabled={loading || query.page >= totalPages}>
          Next
        </Button>
      </div>
      <AlertDialog open={Boolean(statusConfirmation)} onOpenChange={(open) => { if (!open && !statusUpdatingId) setStatusConfirmation(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark this enquiry {statusConfirmation?.status}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this enquiry as {statusConfirmation?.status}? This status update cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusUpdateError && <p className="text-sm font-medium text-destructive">{statusUpdateError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(statusUpdatingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(statusUpdatingId)}
              onClick={async (event) => {
                event.preventDefault();
                if (!statusConfirmation) return;
                const updated = await updateStatus(statusConfirmation.inquiryId, statusConfirmation.status);
                if (updated) setStatusConfirmation(null);
              }}
            >
              {statusUpdatingId ? "Updating…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
