import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Download, MoreVertical, ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";

type ConversionStatus = "New" | "Assigned" | "Contacted" | "Properties Shared" | "Site Visit Scheduled" | "Site Visit Completed" | "Negotiation" | "Booked" | "Won" | "Lost";

interface Lead {
  id: number;
  name: string;
  initials: string;
  avatar?: string;
  enquiryType: string;
  budget: string;
  created: string;
  conversionStatus: ConversionStatus;
  owner: string;
}

const ALL_LEADS: Lead[] = [
  { id: 1,  name: "Shuja ibn Wahb",            initials: "SW", enquiryType: "Apartment",    budget: "₹40L – ₹60L",   created: "3 Sep, 2023",  conversionStatus: "New",                    owner: "Robert Fox" },
  { id: 2,  name: "Ammar ibn Yasir",           initials: "AM", enquiryType: "Condominium",  budget: "₹80L – ₹1Cr",   created: "8 Sep, 2023",  conversionStatus: "Contacted",              owner: "Annette Black" },
  { id: 3,  name: "Abu Talha al-Ansari",       initials: "AT", enquiryType: "Multi Family", budget: "₹1Cr – ₹1.5Cr", created: "9 Sep, 2023",  conversionStatus: "Properties Shared",     owner: "Kristin Watson" },
  { id: 4,  name: "Zayd ibn Harithah",         initials: "ZH", enquiryType: "Townhouse",    budget: "₹50L – ₹75L",   created: "11 Sep, 2023", conversionStatus: "Site Visit Scheduled",  owner: "Arlene McCoy" },
  { id: 5,  name: "Ubadah ibn al-Samit",       initials: "UB", enquiryType: "Condominium",  budget: "₹60L – ₹90L",   created: "30 Aug, 2023", conversionStatus: "New",                    owner: "Jenny Wilson" },
  { id: 6,  name: "Al-Arqam ibn Abi al-Arqam", initials: "AL", enquiryType: "Multi Family", budget: "₹2Cr – ₹3Cr",   created: "24 Aug, 2023", conversionStatus: "Won",                    owner: "Marvin McKinney" },
  { id: 7,  name: "Miqdad ibn Aswad",          initials: "MI", enquiryType: "Multi Family", budget: "₹1.2Cr – ₹2Cr", created: "21 Aug, 2023", conversionStatus: "Assigned",               owner: "Courtney Henry" },
  { id: 8,  name: "Abu Bakr",                  initials: "AB", enquiryType: "Apartment",    budget: "₹35L – ₹50L",   created: "14 Aug, 2023", conversionStatus: "Booked",                 owner: "Darrell Steward" },
  { id: 9,  name: "Uthman ibn Hunaif",         initials: "UT", enquiryType: "Townhouse",    budget: "₹70L – ₹1Cr",   created: "11 Aug, 2023", conversionStatus: "Negotiation",            owner: "Jerome Bell" },
  { id: 10, name: "Amir ibn Fuhayra",          initials: "AM", enquiryType: "Apartment",    budget: "₹45L – ₹65L",   created: "10 Aug, 2023", conversionStatus: "New",                    owner: "Theresa Webb" },
  { id: 11, name: "Amr ibn al-Jamuh",          initials: "AM", enquiryType: "Townhouse",    budget: "₹55L – ₹80L",   created: "7 Aug, 2023",  conversionStatus: "Site Visit Completed",  owner: "Guy Hawkins" },
  { id: 12, name: "Bilal ibn Rabah",           initials: "BI", enquiryType: "Villa",        budget: "₹1.5Cr – ₹2Cr", created: "5 Aug, 2023",  conversionStatus: "New",                    owner: "Robert Fox" },
  { id: 13, name: "Salman al-Farisi",          initials: "SF", enquiryType: "Apartment",    budget: "₹30L – ₹50L",   created: "2 Aug, 2023",  conversionStatus: "Contacted",              owner: "Annette Black" },
  { id: 14, name: "Hudhayfah ibn al-Yaman",    initials: "HU", enquiryType: "Condominium",  budget: "₹90L – ₹1.2Cr", created: "28 Jul, 2023", conversionStatus: "Assigned",               owner: "Kristin Watson" },
  { id: 15, name: "Abu Dharr al-Ghifari",      initials: "AD", enquiryType: "Townhouse",    budget: "₹60L – ₹85L",   created: "25 Jul, 2023", conversionStatus: "Lost",                   owner: "Arlene McCoy" },
  { id: 16, name: "Khabbab ibn al-Aratt",      initials: "KH", enquiryType: "Multi Family", budget: "₹1Cr – ₹1.8Cr", created: "20 Jul, 2023", conversionStatus: "New",                    owner: "Jenny Wilson" },
  { id: 17, name: "Abdullah ibn Masud",        initials: "AB", enquiryType: "Villa",        budget: "₹2Cr – ₹3.5Cr", created: "15 Jul, 2023", conversionStatus: "Properties Shared",     owner: "Marvin McKinney" },
  { id: 18, name: "Muadh ibn Jabal",           initials: "MU", enquiryType: "Apartment",    budget: "₹40L – ₹60L",   created: "10 Jul, 2023", conversionStatus: "New",                    owner: "Courtney Henry" },
  { id: 19, name: "Sad ibn Abi Waqqas",        initials: "SA", enquiryType: "Condominium",  budget: "₹75L – ₹1Cr",   created: "5 Jul, 2023",  conversionStatus: "Site Visit Scheduled",  owner: "Darrell Steward" },
  { id: 20, name: "Talhah ibn Ubaydullah",     initials: "TA", enquiryType: "Townhouse",    budget: "₹50L – ₹70L",   created: "1 Jul, 2023",  conversionStatus: "Booked",                 owner: "Jerome Bell" },
  { id: 21, name: "Zubayr ibn al-Awwam",       initials: "ZU", enquiryType: "Multi Family", budget: "₹1.5Cr – ₹2Cr", created: "25 Jun, 2023", conversionStatus: "New",                    owner: "Theresa Webb" },
  { id: 22, name: "Abd al-Rahman ibn Awf",     initials: "AR", enquiryType: "Villa",        budget: "₹3Cr – ₹5Cr",   created: "20 Jun, 2023", conversionStatus: "Negotiation",            owner: "Guy Hawkins" },
  { id: 23, name: "Said ibn Zayd",             initials: "SA", enquiryType: "Apartment",    budget: "₹35L – ₹55L",   created: "15 Jun, 2023", conversionStatus: "Site Visit Completed",  owner: "Robert Fox" },
  { id: 24, name: "Abu Ubaydah ibn al-Jarrah", initials: "AU", enquiryType: "Condominium",  budget: "₹80L – ₹1.1Cr", created: "10 Jun, 2023", conversionStatus: "Won",                    owner: "Annette Black" },
  { id: 25, name: "Sad ibn Muadh",             initials: "SM", enquiryType: "Townhouse",    budget: "₹55L – ₹80L",   created: "5 Jun, 2023",  conversionStatus: "Lost",                   owner: "Kristin Watson" },
];

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

function Avatar({ initials, src }: { initials: string; src?: string }) {
  if (src) return <img src={src} alt={initials} className="h-8 w-8 rounded-full object-cover shrink-0" />;
  const colors: Record<string, string> = {
    S: "bg-blue-100 text-blue-600", A: "bg-orange-100 text-orange-600",
    Z: "bg-purple-100 text-purple-600", U: "bg-teal-100 text-teal-600",
    M: "bg-pink-100 text-pink-600", B: "bg-green-100 text-green-600",
    H: "bg-indigo-100 text-indigo-600", K: "bg-yellow-100 text-yellow-600",
    T: "bg-red-100 text-red-600",
  };
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${colors[initials[0]] ?? "bg-gray-100 text-gray-600"}`}>
      {initials}
    </div>
  );
}

export default function LeadsPage() {
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<number[]>([]);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ConversionStatus | "All">("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_LEADS.filter((l) => {
      const matchSearch = l.name.toLowerCase().includes(q) || l.enquiryType.toLowerCase().includes(q) || l.owner.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || l.conversionStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allChecked  = paged.length > 0 && paged.every((l) => selected.includes(l.id));
  const someChecked = paged.some((l) => selected.includes(l.id));

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
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 w-52 text-sm"
          />
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" disabled={selected.length === 0}>
              Bulk Action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Delete selected</DropdownMenuItem>
            <DropdownMenuItem>Export selected</DropdownMenuItem>
            <DropdownMenuItem>Assign owner</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              Status: {statusFilter} <ChevronDown className="h-3.5 w-3.5" />
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
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked && !allChecked ? "indeterminate" : undefined}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Budget</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conversion Status</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-12">No leads found</td>
              </tr>
            ) : paged.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggle(lead.id)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={lead.initials} src={lead.avatar} />
                    <span className="font-medium text-foreground">{lead.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.enquiryType}</td>

                <td className="px-4 py-3 font-medium text-foreground">{lead.budget}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.created}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.conversionStatus} />
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
