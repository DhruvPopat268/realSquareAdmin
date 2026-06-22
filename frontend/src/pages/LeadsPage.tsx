import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Download, Filter, ArrowUpDown, MoreVertical, ChevronLeft,
  ChevronRight, SlidersHorizontal,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type ConversionStatus = "New" | "Viewing" | "Assigned" | "Closed Won";

interface Lead {
  id: number;
  name: string;
  initials: string;
  avatar?: string;
  enquiryType: string;
  created: string;
  nextFollowUpdate: string;
  conversionStatus: ConversionStatus;
  owner: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────
const ALL_LEADS: Lead[] = [
  { id: 1,  name: "Shuja ibn Wahb",           initials: "SW", enquiryType: "Apartment",    created: "3 Sep, 2023",  nextFollowUpdate: "24 Oct, 2020", conversionStatus: "New",        owner: "Robert Fox" },
  { id: 2,  name: "Ammar ibn Yasir",          initials: "AM", enquiryType: "Condominium",  created: "8 Sep, 2023",  nextFollowUpdate: "8 Oct, 2023",  conversionStatus: "Viewing",    owner: "Annette Black" },
  { id: 3,  name: "Abu Talha al-Ansari",      initials: "AT", enquiryType: "Multi Family", created: "9 Sep, 2023",  nextFollowUpdate: "22 Oct, 2023", conversionStatus: "New",        owner: "Kristin Watson" },
  { id: 4,  name: "Zayd ibn Harithah",        initials: "ZH", enquiryType: "Townhouse",    created: "11 Sep, 2023", nextFollowUpdate: "21 Oct, 2023", conversionStatus: "Viewing",    owner: "Arlene McCoy" },
  { id: 5,  name: "Ubadah ibn al-Samit",      initials: "UB", enquiryType: "Condominium",  created: "30 Aug, 2023", nextFollowUpdate: "17 Oct, 2023", conversionStatus: "New",        owner: "Jenny Wilson" },
  { id: 6,  name: "Al-Arqam ibn Abi al-Arqam",initials: "AL", enquiryType: "Multi Family", created: "24 Aug, 2023", nextFollowUpdate: "2 Oct, 2023",  conversionStatus: "Closed Won", owner: "Marvin McKinney" },
  { id: 7,  name: "Miqdad ibn Aswad",         initials: "MI", enquiryType: "Multi Family", created: "21 Aug, 2023", nextFollowUpdate: "22 Oct, 2023", conversionStatus: "Assigned",   owner: "Courtney Henry" },
  { id: 8,  name: "Abu Bakr",                 initials: "AB", enquiryType: "Apartment",    created: "14 Aug, 2023", nextFollowUpdate: "17 Oct, 2023", conversionStatus: "Closed Won", owner: "Darrell Steward" },
  { id: 9,  name: "Uthman ibn Hunaif",        initials: "UT", enquiryType: "Townhouse",    created: "11 Aug, 2023", nextFollowUpdate: "24 Oct, 2023", conversionStatus: "Assigned",   owner: "Jerome Bell" },
  { id: 10, name: "Amir ibn Fuhayra",         initials: "AM", enquiryType: "Apartment",    created: "10 Aug, 2023", nextFollowUpdate: "12 Nov, 2023", conversionStatus: "New",        owner: "Theresa Webb" },
  { id: 11, name: "Amr ibn al-Jamuh",         initials: "AM", enquiryType: "Townhouse",    created: "7 Aug, 2023",  nextFollowUpdate: "17 Nov, 2023", conversionStatus: "Viewing",    owner: "Guy Hawkins" },
  { id: 12, name: "Bilal ibn Rabah",          initials: "BI", enquiryType: "Villa",        created: "5 Aug, 2023",  nextFollowUpdate: "10 Nov, 2023", conversionStatus: "New",        owner: "Robert Fox" },
  { id: 13, name: "Salman al-Farisi",         initials: "SF", enquiryType: "Apartment",    created: "2 Aug, 2023",  nextFollowUpdate: "8 Nov, 2023",  conversionStatus: "Viewing",    owner: "Annette Black" },
  { id: 14, name: "Hudhayfah ibn al-Yaman",   initials: "HU", enquiryType: "Condominium",  created: "28 Jul, 2023", nextFollowUpdate: "5 Nov, 2023",  conversionStatus: "Assigned",   owner: "Kristin Watson" },
  { id: 15, name: "Abu Dharr al-Ghifari",     initials: "AD", enquiryType: "Townhouse",    created: "25 Jul, 2023", nextFollowUpdate: "1 Nov, 2023",  conversionStatus: "Closed Won", owner: "Arlene McCoy" },
  { id: 16, name: "Khabbab ibn al-Aratt",     initials: "KH", enquiryType: "Multi Family", created: "20 Jul, 2023", nextFollowUpdate: "28 Oct, 2023", conversionStatus: "New",        owner: "Jenny Wilson" },
  { id: 17, name: "Abdullah ibn Masud",       initials: "AB", enquiryType: "Villa",        created: "15 Jul, 2023", nextFollowUpdate: "25 Oct, 2023", conversionStatus: "Viewing",    owner: "Marvin McKinney" },
  { id: 18, name: "Muadh ibn Jabal",          initials: "MU", enquiryType: "Apartment",    created: "10 Jul, 2023", nextFollowUpdate: "20 Oct, 2023", conversionStatus: "New",        owner: "Courtney Henry" },
  { id: 19, name: "Sad ibn Abi Waqqas",       initials: "SA", enquiryType: "Condominium",  created: "5 Jul, 2023",  nextFollowUpdate: "15 Oct, 2023", conversionStatus: "Assigned",   owner: "Darrell Steward" },
  { id: 20, name: "Talhah ibn Ubaydullah",    initials: "TA", enquiryType: "Townhouse",    created: "1 Jul, 2023",  nextFollowUpdate: "10 Oct, 2023", conversionStatus: "Closed Won", owner: "Jerome Bell" },
  { id: 21, name: "Zubayr ibn al-Awwam",      initials: "ZU", enquiryType: "Multi Family", created: "25 Jun, 2023", nextFollowUpdate: "5 Oct, 2023",  conversionStatus: "New",        owner: "Theresa Webb" },
  { id: 22, name: "Abd al-Rahman ibn Awf",    initials: "AR", enquiryType: "Villa",        created: "20 Jun, 2023", nextFollowUpdate: "1 Oct, 2023",  conversionStatus: "Viewing",    owner: "Guy Hawkins" },
  { id: 23, name: "Said ibn Zayd",            initials: "SA", enquiryType: "Apartment",    created: "15 Jun, 2023", nextFollowUpdate: "28 Sep, 2023", conversionStatus: "Assigned",   owner: "Robert Fox" },
  { id: 24, name: "Abu Ubaydah ibn al-Jarrah",initials: "AU", enquiryType: "Condominium",  created: "10 Jun, 2023", nextFollowUpdate: "25 Sep, 2023", conversionStatus: "New",        owner: "Annette Black" },
  { id: 25, name: "Sad ibn Muadh",            initials: "SM", enquiryType: "Townhouse",    created: "5 Jun, 2023",  nextFollowUpdate: "20 Sep, 2023", conversionStatus: "Closed Won", owner: "Kristin Watson" },
];

const PAGE_SIZES = [11, 50, 100, 150];

const statusStyles: Record<ConversionStatus, string> = {
  New:        "bg-blue-50 text-blue-600 border border-blue-200",
  Viewing:    "bg-amber-50 text-amber-600 border border-amber-200",
  Assigned:   "bg-green-50 text-green-600 border border-green-200",
  "Closed Won":"bg-red-50 text-red-500 border border-red-200",
};

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
  const color = colors[initials[0]] ?? "bg-gray-100 text-gray-600";
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${color}`}>
      {initials}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<number[]>([]);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(11);
  const [sortOrder, setSortOrder]     = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = ALL_LEADS.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.enquiryType.toLowerCase().includes(q) ||
        l.owner.toLowerCase().includes(q)
    );
    return sortOrder === "newest" ? list : [...list].reverse();
  }, [search, sortOrder]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allChecked  = paged.length > 0 && paged.every((l) => selected.includes(l.id));
  const someChecked = paged.some((l) => selected.includes(l.id));

  const toggleAll = () =>
    setSelected(allChecked ? selected.filter((id) => !paged.find((l) => l.id === id)) : [...new Set([...selected, ...paged.map((l) => l.id)])]);

  const toggle = (id: number) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  // page number chips: 1 2 3 … 50 100 150
  const pageChips = [1, 2, 3];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
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
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          Save Search
        </Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        {/* Bulk Action */}
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

        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortOrder === "newest" ? "Newest to Oldest" : "Oldest to Newest"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOrder("newest")}>Newest to Oldest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder("oldest")}>Oldest to Newest</DropdownMenuItem>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enquiry Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Next Follow Update</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conversion Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-12">No leads found</td>
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
                <td className="px-4 py-3 text-muted-foreground">{lead.created}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.nextFollowUpdate}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.conversionStatus} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.owner}</td>
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
        <span>
          Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage(1)}
            className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageChips.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${
                page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}

          <span className="px-1">···</span>

          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => { setPageSize(size); setPage(1); }}
              className={`h-8 px-2.5 rounded-md border text-sm font-medium transition-colors ${
                pageSize === size && !pageChips.includes(page)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {size}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="h-8 w-8 rounded-md border flex items-center justify-center disabled:opacity-40 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
