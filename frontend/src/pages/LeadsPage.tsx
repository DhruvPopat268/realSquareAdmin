import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Download, ChevronLeft, ChevronRight, ChevronDown, CalendarIcon, Pencil, Trash2,
} from "lucide-react";
import { CITIES } from "@/data/citiesData";

type ConversionStatus = "New" | "Assigned" | "Contacted" | "Properties Shared" | "Site Visit Scheduled" | "Site Visit Completed" | "Negotiation" | "Booked" | "Won" | "Lost";

interface Lead {
  id: number;
  name: string;
  initials: string;
  avatar?: string;
  mobile: string;
  email: string;
  propertyPurpose: string;
  propertyCategory: string;
  propertyType: string;
  furnishingStatus?: string;
  preferredCity?: string;
  preferredArea?: string;
  preferredSpecificLocation?: string;
  moveInTimeline?: string;
  priority?: string;
  lastFollowUpDate?: string;
  remarks?: string;
  communicationPreference?: string[];
  enquiryType: string;
  budget: string;
  created: string;
  conversionStatus: ConversionStatus;
  owner: string;
}

const ALL_LEADS: Lead[] = [
  { id: 1,  name: "Shuja ibn Wahb",            initials: "SW", mobile: "+91 98001 00001", email: "shuja@example.com",       propertyPurpose: "Sell",          propertyCategory: "Residential", propertyType: "Apartment",                 enquiryType: "Apartment",    budget: "₹40L – ₹60L",   created: "3 Sep, 2023",  conversionStatus: "New",                   owner: "Robert Fox",       furnishingStatus: "Full-Furnished", moveInTimeline: "Immediate",   priority: "Hot",    preferredCity: "Mumbai",     preferredArea: "Andheri",       preferredSpecificLocation: "Andheri West",      lastFollowUpDate: "10 Jan, 2024", remarks: "Very interested, waiting for site visit",        communicationPreference: ["Call", "WhatsApp"] },
  { id: 2,  name: "Ammar ibn Yasir",           initials: "AM", mobile: "+91 98001 00002", email: "ammar@example.com",       propertyPurpose: "Rent",          propertyCategory: "Residential", propertyType: "Independent House / Villa", enquiryType: "Condominium",  budget: "₹80L – ₹1Cr",   created: "8 Sep, 2023",  conversionStatus: "Contacted",             owner: "Annette Black",    furnishingStatus: "Semi-Furnished", moveInTimeline: "1–2 Months",  priority: "Warm",   preferredCity: "Pune",       preferredArea: "Koregaon Park", preferredSpecificLocation: "North Main Road",    lastFollowUpDate: "8 Jan, 2024",  remarks: "Needs furnished option, flexible on area",       communicationPreference: ["WhatsApp"] },
  { id: 3,  name: "Abu Talha al-Ansari",       initials: "AT", mobile: "+91 98001 00003", email: "abutalha@example.com",    propertyPurpose: "Sell",          propertyCategory: "Commercial",  propertyType: "Office Space",              enquiryType: "Multi Family", budget: "₹1Cr – ₹1.5Cr", created: "9 Sep, 2023",  conversionStatus: "Properties Shared",    owner: "Kristin Watson",   furnishingStatus: "None",           moveInTimeline: "3–6 Months",  priority: "Cold",   preferredCity: "Bangalore",  preferredArea: "Whitefield",    preferredSpecificLocation: "ITPL Main Road",     lastFollowUpDate: "5 Jan, 2024",  remarks: "Shared 3 properties, awaiting feedback",        communicationPreference: ["Email", "Call"] },
  { id: 4,  name: "Zayd ibn Harithah",         initials: "ZH", mobile: "+91 98001 00004", email: "zayd@example.com",        propertyPurpose: "Rent",          propertyCategory: "Residential", propertyType: "Builder Floor",             enquiryType: "Townhouse",    budget: "₹50L – ₹75L",   created: "11 Sep, 2023", conversionStatus: "Site Visit Scheduled", owner: "Arlene McCoy",     furnishingStatus: "Full-Furnished", moveInTimeline: "Immediate",   priority: "Hot",    preferredCity: "Delhi",      preferredArea: "Dwarka",        preferredSpecificLocation: "Sector 12",          lastFollowUpDate: "11 Jan, 2024", remarks: "Site visit confirmed for 15th Jan",             communicationPreference: ["Call"] },
  { id: 5,  name: "Ubadah ibn al-Samit",       initials: "UB", mobile: "+91 98001 00005", email: "ubadah@example.com",      propertyPurpose: "PG / Co-living",propertyCategory: "Residential", propertyType: "Studio Apartment",          enquiryType: "Condominium",  budget: "₹60L – ₹90L",   created: "30 Aug, 2023", conversionStatus: "New",                   owner: "Jenny Wilson",     furnishingStatus: "Semi-Furnished", moveInTimeline: "1–2 Months",  priority: "Warm",   preferredCity: "Hyderabad",  preferredArea: "Gachibowli",    preferredSpecificLocation: "DLF Cyber City",     lastFollowUpDate: "9 Jan, 2024",  remarks: "Looking for studio near IT park",               communicationPreference: ["SMS", "WhatsApp"] },
  { id: 6,  name: "Al-Arqam ibn Abi al-Arqam", initials: "AL", mobile: "+91 98001 00006", email: "alarqam@example.com",     propertyPurpose: "Sell",          propertyCategory: "Land / Plot",  propertyType: "Commercial Plot",           enquiryType: "Multi Family", budget: "₹2Cr – ₹3Cr",   created: "24 Aug, 2023", conversionStatus: "Won",                   owner: "Marvin McKinney",  furnishingStatus: undefined,        moveInTimeline: undefined,     priority: undefined, preferredCity: "Chennai",    preferredArea: "OMR",           preferredSpecificLocation: "Sholinganallur",      lastFollowUpDate: "2 Jan, 2024",  remarks: "Deal closed successfully",                      communicationPreference: ["WhatsApp", "Email"] },
  { id: 7,  name: "Miqdad ibn Aswad",          initials: "MI", mobile: "+91 98001 00007", email: "miqdad@example.com",      propertyPurpose: "Rent",          propertyCategory: "Commercial",  propertyType: "Warehouse / Godown",        enquiryType: "Multi Family", budget: "₹1.2Cr – ₹2Cr", created: "21 Aug, 2023", conversionStatus: "Assigned",              owner: "Courtney Henry",   furnishingStatus: "None",           moveInTimeline: "3–6 Months",  priority: "Cold",   preferredCity: "Ahmedabad",  preferredArea: "SG Highway",    preferredSpecificLocation: "Prahlad Nagar",      lastFollowUpDate: "6 Jan, 2024",  remarks: "Needs large warehouse, reviewing options",      communicationPreference: ["Email"] },
  { id: 8,  name: "Abu Bakr",                  initials: "AB", mobile: "+91 98001 00008", email: "abubakr@example.com",     propertyPurpose: "Sell",          propertyCategory: "Residential", propertyType: "Penthouse",                 enquiryType: "Apartment",    budget: "₹35L – ₹50L",   created: "14 Aug, 2023", conversionStatus: "Booked",                owner: "Darrell Steward",  furnishingStatus: "Full-Furnished", moveInTimeline: "Immediate",   priority: "Hot",    preferredCity: "Kolkata",    preferredArea: "Salt Lake",     preferredSpecificLocation: "Sector V",           lastFollowUpDate: "12 Jan, 2024", remarks: "Booked penthouse, token amount received",       communicationPreference: ["Call", "SMS"] },
  
];

const PROPERTY_PURPOSES   = ["Sell", "Rent", "PG / Co-living"];
const PROPERTY_CATEGORIES = ["Residential", "Commercial", "Land / Plot"];
const PROPERTY_TYPES      = ["Apartment", "Independent House / Villa", "Builder Floor", "Studio Apartment", "Penthouse", "Office Space", "Warehouse / Godown", "Commercial Plot"];
const FURNISHING_STATUSES = ["Full-Furnished", "Semi-Furnished", "None"];
const PRIORITIES          = ["Hot", "Warm", "Cold"];

const PAGE_SIZES = [10, 25, 50, 100];

const statusStyles: Record<ConversionStatus, string> = {
  New:                    "bg-blue-50 text-blue-600 border border-blue-200",
  Assigned:               "bg-violet-50 text-violet-600 border border-violet-200",
  Contacted:              "bg-sky-50 text-sky-600 border border-sky-200",
  "Properties Shared":    "bg-cyan-50 text-cyan-600 border border-cyan-200",
  "Site Visit Scheduled": "bg-amber-50 text-amber-600 border border-amber-200",
  "Site Visit Completed": "bg-orange-50 text-orange-600 border border-orange-200",
  Negotiation:            "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Booked:                 "bg-teal-50 text-teal-600 border border-teal-200",
  Won:                    "bg-green-50 text-green-600 border border-green-200",
  Lost:                   "bg-red-50 text-red-500 border border-red-200",
};

const ALL_STATUSES: Array<ConversionStatus | "All"> = ["All", "New", "Assigned", "Contacted", "Properties Shared", "Site Visit Scheduled", "Site Visit Completed", "Negotiation", "Booked", "Won", "Lost"];

function StatusBadge({ status }: { status: ConversionStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={value !== "All" ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[130px] justify-between">
          {label}{value !== "All" ? `: ${value}` : ""} <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange("All")}>All</DropdownMenuItem>
        {options.map((o) => <DropdownMenuItem key={o} onClick={() => onChange(o)}>{o}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function LeadsPage() {
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<number[]>([]);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ConversionStatus | "All">("All");

  const [purposeFilter,    setPurposeFilter]    = useState("All");
  const [categoryFilter,   setCategoryFilter]   = useState("All");
  const [typeFilter,       setTypeFilter]       = useState("All");
  const [furnishingFilter, setFurnishingFilter] = useState("All");
  const [cityFilter,       setCityFilter]       = useState("All");
  const [priorityFilter,   setPriorityFilter]   = useState("All");

  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo,   setDateTo]   = useState<Date | undefined>();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_LEADS.filter((l) => {
      const matchSearch    = l.name.toLowerCase().includes(q) || l.enquiryType.toLowerCase().includes(q) || l.owner.toLowerCase().includes(q);
      const matchStatus    = statusFilter     === "All" || l.conversionStatus === statusFilter;
      const matchPurpose   = purposeFilter    === "All" || l.propertyPurpose  === purposeFilter;
      const matchCategory  = categoryFilter   === "All" || l.propertyCategory === categoryFilter;
      const matchType      = typeFilter       === "All" || l.propertyType     === typeFilter;
      const matchFurnish   = furnishingFilter === "All" || l.furnishingStatus === furnishingFilter;
      const matchCity      = cityFilter       === "All" || l.preferredCity    === cityFilter;
      const matchPriority  = priorityFilter   === "All" || l.priority         === priorityFilter;
      const createdDate    = new Date(l.created);
      const matchFrom      = !dateFrom || createdDate >= dateFrom;
      const matchTo        = !dateTo   || createdDate <= dateTo;
      return matchSearch && matchStatus && matchPurpose && matchCategory && matchType && matchFurnish && matchCity && matchPriority && matchFrom && matchTo;
    });
  }, [search, statusFilter, purposeFilter, categoryFilter, typeFilter, furnishingFilter, cityFilter, priorityFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allChecked  = paged.length > 0 && paged.every((l) => selected.includes(l.id));
  const someChecked = paged.some((l) => selected.includes(l.id));

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = tableWrapperRef.current;
      if (!el) return;
      el.scrollLeft += e.key === "ArrowRight" ? 120 : -120;
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const toggleAll = () =>
    setSelected(allChecked ? selected.filter((id) => !paged.find((l) => l.id === id)) : [...new Set([...selected, ...paged.map((l) => l.id)])]);
  const toggle = (id: number) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold" disabled={selected.length === 0}>
                Bulk Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Delete selected</DropdownMenuItem>
              <DropdownMenuItem>Export selected</DropdownMenuItem>
              <DropdownMenuItem>Assign owner</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {/* Filter Row 1: Search on left, Date range + Purpose + Category + Type on right */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 w-64 text-sm"
          />
        </div>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground font-medium">Created:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={dateFrom ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[130px] justify-between">
              <CalendarIcon className="h-3 w-3" />
              {dateFrom ? dateFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(1); }} initialFocus />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={dateTo ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[130px] justify-between">
              <CalendarIcon className="h-3 w-3 shrink-0" />
              {dateTo ? dateTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} initialFocus />
          </PopoverContent>
        </Popover>
        <div className="w-px h-5 bg-border mx-1" />
        <FilterDropdown label="Purpose"  value={purposeFilter}  options={PROPERTY_PURPOSES}   onChange={(v) => { setPurposeFilter(v);  setPage(1); }} />
        <FilterDropdown label="Category" value={categoryFilter} options={PROPERTY_CATEGORIES} onChange={(v) => { setCategoryFilter(v); setPage(1); }} />
        <FilterDropdown label="Type"     value={typeFilter}     options={PROPERTY_TYPES}      onChange={(v) => { setTypeFilter(v);     setPage(1); }} />
      </div>

      {/* Filter Row 2: Furnishing, City, Priority, Status, Clear — all on right */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <FilterDropdown label="Furnishing" value={furnishingFilter} options={FURNISHING_STATUSES}       onChange={(v) => { setFurnishingFilter(v); setPage(1); }} />
        <FilterDropdown label="City"       value={cityFilter}       options={CITIES.map((c) => c.name)} onChange={(v) => { setCityFilter(v);       setPage(1); }} />
        <FilterDropdown label="Priority"   value={priorityFilter}   options={PRIORITIES}                onChange={(v) => { setPriorityFilter(v);   setPage(1); }} />
        <div className="w-px h-5 bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={statusFilter !== "All" ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs min-w-[130px] justify-between">
              Status{statusFilter !== "All" ? `: ${statusFilter}` : ""} <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ALL_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); setPage(1); }}>
                {s === "All" ? "All Statuses" : s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {(purposeFilter !== "All" || categoryFilter !== "All" || typeFilter !== "All" || furnishingFilter !== "All" || cityFilter !== "All" || priorityFilter !== "All" || statusFilter !== "All" || dateFrom || dateTo) && (
          <button
            onClick={() => { setPurposeFilter("All"); setCategoryFilter("All"); setTypeFilter("All"); setFurnishingFilter("All"); setCityFilter("All"); setPriorityFilter("All"); setStatusFilter("All"); setDateFrom(undefined); setDateTo(undefined); setPage(1); }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
          >Clear all</button>
        )}
      </div>

      {/* Table */}
      <div ref={tableWrapperRef} className="rounded-lg border bg-card overflow-x-auto">
        <table className="min-w-max w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked && !allChecked ? "indeterminate" : undefined}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact Details</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Purpose</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Types</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[150px]">Furnishing Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[140px]">Preferred City</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[140px]">Preferred Area</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[180px]">Preferred Specific Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[150px]">Move-In Timeline</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Budget</th>
             
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conversion Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[150px]">Last Follow-Up</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[200px]">Remarks</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[180px]">Communication Preference</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-muted-foreground py-12">No leads found</td>
              </tr>
            ) : paged.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggle(lead.id)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.created}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{lead.name}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground">{lead.mobile}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.propertyPurpose}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.propertyCategory}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.propertyType}</td>
               
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.furnishingStatus}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.preferredCity ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.preferredArea ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.preferredSpecificLocation ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.moveInTimeline}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.priority}</td>
                <td className="px-4 py-3 font-medium text-foreground">{lead.budget}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.conversionStatus} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{lead.lastFollowUpDate ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.remarks ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {lead.communicationPreference?.map((c) => (
                      <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">{c}</span>
                    )) ?? '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1">···</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${
                    page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              )
            )}

          <button
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
