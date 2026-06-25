import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, UserCheck, Download } from "lucide-react";
import { toast } from "sonner";

interface Enquiry {
  id: number;
  name: string;
  initials: string;
  phone: string;
  email: string;
  category: string;
  propertyType: string;
  purpose: string;
  city: string;
  area: string;
  specificLocation: string;
  budget?: string;
  source: string;
  createdAt: string;
  convertedToLead?: boolean;
}

const ALL_ENQUIRIES: Enquiry[] = [
  { id: 1,  name: "Shuja ibn Wahb",             initials: "SW", phone: "+91 98000 00001", email: "shuja@example.com",   category: "Residential", propertyType: "Apartment",                purpose: "Rent",           city: "Mumbai",    area: "Andheri West",  budget: "₹20K–₹35K/mo",   specificLocation: "Flat 4B, Sai Residency",   source: "Website",  createdAt: "3 Sep, 2024" },
  { id: 2,  name: "Ammar ibn Yasir",            initials: "AM", phone: "+91 98000 00002", email: "ammar@example.com",   category: "Residential", propertyType: "Independent House / Villa", purpose: "Sell",           city: "Delhi",     area: "Any",           budget: "₹1.5Cr–₹2.5Cr",  specificLocation: "Any",                      source: "Referral", createdAt: "8 Sep, 2024" },
  { id: 3,  name: "Abu Talha al-Ansari",        initials: "AT", phone: "+91 98000 00003", email: "abut@example.com",    category: "Commercial",  propertyType: "Office Space",             purpose: "Rent",           city: "Bangalore", area: "Koramangala",   budget: "₹80K–₹1.2L/mo",  specificLocation: "2nd Floor, Prestige Tech", source: "Portal",   createdAt: "9 Sep, 2024" },
  { id: 4,  name: "Zayd ibn Harithah",          initials: "ZH", phone: "+91 98000 00004", email: "zayd@example.com",    category: "Residential", propertyType: "Private Room",             purpose: "PG / Co-living", city: "Pune",      area: "Kothrud",       budget: "₹8K–₹12K/mo",    specificLocation: "Any",                      source: "Website",  createdAt: "11 Sep, 2024" },
  { id: 5,  name: "Ubadah ibn al-Samit",        initials: "UB", phone: "+91 98000 00005", email: "ubadah@example.com",  category: "Residential", propertyType: "Apartment",                purpose: "Sell",           city: "Hyderabad", area: "Any",           budget: "₹60L–₹90L",      specificLocation: "Any",                      source: "Walk-in",  createdAt: "30 Aug, 2024" },
  { id: 6,  name: "Al-Arqam ibn Abi al-Arqam",  initials: "AL", phone: "+91 98000 00006", email: "alarqam@example.com", category: "Land / Plot", propertyType: "Commercial Plot",          purpose: "Sell",           city: "Chennai",   area: "OMR",           budget: "₹2Cr–₹4Cr",      specificLocation: "Plot No. 14, SIPCOT",      source: "Portal",   createdAt: "24 Aug, 2024" },
  { id: 7,  name: "Miqdad ibn Aswad",           initials: "MI", phone: "+91 98000 00007", email: "miqdad@example.com",  category: "Commercial",  propertyType: "Warehouse / Godown",       purpose: "Rent",           city: "Mumbai",    area: "Bhiwandi",      budget: "₹1.5L–₹2.5L/mo", specificLocation: "Any",                      source: "Referral", createdAt: "21 Aug, 2024" },
  { id: 8,  name: "Abu Bakr",                   initials: "AB", phone: "+91 98000 00008", email: "abubakr@example.com", category: "Residential", propertyType: "Apartment",                purpose: "Rent",           city: "Bangalore", area: "Any",           budget: "₹25K–₹40K/mo",   specificLocation: "Any",                      source: "Website",  createdAt: "14 Aug, 2024" },
  { id: 9,  name: "Uthman ibn Hunaif",          initials: "UT", phone: "+91 98000 00009", email: "uthman@example.com",  category: "Residential", propertyType: "Builder Floor",            purpose: "Sell",           city: "Delhi",     area: "Dwarka",        budget: "₹80L–₹1.2Cr",    specificLocation: "House No. 23, Sector 5",   source: "Walk-in",  createdAt: "11 Aug, 2024" },
  { id: 10, name: "Bilal ibn Rabah",            initials: "BI", phone: "+91 98000 00010", email: "bilal@example.com",   category: "Residential", propertyType: "Shared Room",              purpose: "PG / Co-living", city: "Pune",      area: "Viman Nagar",   budget: "₹6K–₹10K/mo",    specificLocation: "Any",                      source: "Portal",   createdAt: "5 Aug, 2024" },
];

const purposeStyle: Record<string, string> = {
  "Sell":          "bg-blue-50 text-blue-600",
  "Rent":          "bg-green-50 text-green-600",
  "PG / Co-living":"bg-purple-50 text-purple-600",
};

function Avatar({ initials }: { initials: string }) {
  const colors: Record<string, string> = {
    S: "bg-blue-100 text-blue-600", A: "bg-orange-100 text-orange-600",
    Z: "bg-purple-100 text-purple-600", U: "bg-teal-100 text-teal-600",
    M: "bg-pink-100 text-pink-600", B: "bg-green-100 text-green-600",
    H: "bg-indigo-100 text-indigo-600", T: "bg-red-100 text-red-600",
  };
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${colors[initials[0]] ?? "bg-gray-100 text-gray-600"}`}>
      {initials}
    </div>
  );
}

export default function EnquiriesPage() {
  const [data, setData]                     = useState(ALL_ENQUIRIES);
  const [search, setSearch]                 = useState("");
  const [selected, setSelected]             = useState<number[]>([]);
  const [purposeFilter, setPurposeFilter]   = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // convert dialog — array supports both single & bulk
  const [convertTargets, setConvertTargets] = useState<Enquiry[]>([]);

  // single-convert fields

  // per-lead budget map: { [enquiryId]: budget string }
  const [budgets, setBudgets]           = useState<Record<number, string>>({});
  const [budgetErrors, setBudgetErrors] = useState<Record<number, string>>({});

  // verifier fields (shared across single & bulk)
  const [verifierName, setVerifierName]     = useState("");
  const [verifierMobile, setVerifierMobile] = useState("");
  const [verifierErrors, setVerifierErrors] = useState<{ name?: string; mobile?: string }>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((e) => {
      const matchSearch   = e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.propertyType.toLowerCase().includes(q) || e.area.toLowerCase().includes(q) || e.specificLocation.toLowerCase().includes(q);
      const matchPurpose  = purposeFilter  === "All" || e.purpose  === purposeFilter;
      const matchCategory = categoryFilter === "All" || e.category === categoryFilter;
      return matchSearch && matchPurpose && matchCategory;
    });
  }, [data, search, purposeFilter, categoryFilter]);

  const allChecked  = filtered.length > 0 && filtered.every((e) => selected.includes(e.id));
  const someChecked = filtered.some((e) => selected.includes(e.id));
  const toggleAll   = () => setSelected(allChecked ? selected.filter((id) => !filtered.find((e) => e.id === id)) : [...new Set([...selected, ...filtered.map((e) => e.id)])]);
  const toggle      = (id: number) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const bulkCount = selected.filter((id) => !data.find((e) => e.id === id)?.convertedToLead).length;

  function openConvert(targets: Enquiry[]) {
    setConvertTargets(targets);
    setVerifierName("");
    setVerifierMobile("");
    setVerifierErrors({});
    const init: Record<number, string> = {};
    targets.forEach((e) => { init[e.id] = e.budget ?? ""; });
    setBudgets(init);
    setBudgetErrors({});
  }

  function handleConvert() {
    // validate per-lead budgets
    const bErrs: Record<number, string> = {};
    convertTargets.forEach((e) => {
      if (!budgets[e.id]?.trim()) bErrs[e.id] = "Budget is required";
    });

    // validate verifier
    const vErrs: { name?: string; mobile?: string } = {};
    if (!verifierName.trim())   vErrs.name   = "Verifier name is required";
    if (!verifierMobile.trim()) vErrs.mobile = "Verifier mobile is required";

    if (convertTargets.length === 1) {
      if (Object.keys(bErrs).length || Object.keys(vErrs).length) {
        setBudgetErrors(bErrs);
        setVerifierErrors(vErrs);
        return;
      }
    } else {
      if (Object.keys(bErrs).length || Object.keys(vErrs).length) {
        setBudgetErrors(bErrs);
        setVerifierErrors(vErrs);
        return;
      }
    }

    setData((prev) => prev.map((e) => {
      const target = convertTargets.find((t) => t.id === e.id);
      return target ? { ...e, convertedToLead: true, budget: budgets[e.id]?.trim() } : e;
    }));

    if (convertTargets.length === 1) {
      toast.success(`${convertTargets[0].name} has been converted to a Lead.`);
    } else {
      setSelected((s) => s.filter((id) => !convertTargets.find((t) => t.id === id)));
      toast.success(`${convertTargets.length} enquiries converted to Leads.`);
    }
    setConvertTargets([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Enquiries</h1>
        <div className="flex items-center gap-2">
          {bulkCount > 0 && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => openConvert(filtered.filter((e) => selected.includes(e.id) && !e.convertedToLead))}
            >
              <UserCheck className="h-3.5 w-3.5" /> Convert to Lead ({bulkCount})
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" disabled>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Enquiry
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search enquiries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-56 text-sm" />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{filtered.length} enquir{filtered.length !== 1 ? "ies" : "y"}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Category: {categoryFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Residential", "Commercial", "Land / Plot"].map((c) => (
              <DropdownMenuItem key={c} onClick={() => setCategoryFilter(c)}>{c === "All" ? "All Categories" : c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Purpose: {purposeFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Sell", "Rent", "PG / Co-living"].map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPurposeFilter(p)}>{p === "All" ? "All Purposes" : p}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allChecked} data-state={someChecked && !allChecked ? "indeterminate" : undefined} onCheckedChange={toggleAll} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer Contact Details</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[130px]">Purpose</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Area</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[140px]">Budget</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[130px]">Created Date</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-muted-foreground py-16">No enquiries found</td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3"><Checkbox checked={selected.includes(e.id)} onCheckedChange={() => toggle(e.id)} /></td>
                <td className="px-4 py-3">
                  {!e.convertedToLead ? (
                    <button onClick={() => openConvert([e])} className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-medium transition-colors">
                      <UserCheck className="h-3.5 w-3.5" /> Convert
                    </button>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium">Converted</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={e.initials} />
                    <div>
                      <p className="font-medium text-foreground">{e.name}</p>

                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <p>{e.phone}</p>
                  <p className="text-xs">{e.email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.propertyType}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${purposeStyle[e.purpose] ?? "bg-muted text-muted-foreground"}`}>{e.purpose}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.city}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.area}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.budget ?? <span className="italic text-muted-foreground/50 text-xs">—</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Convert to Lead Dialog */}
      <Dialog open={convertTargets.length > 0} onOpenChange={(o) => !o && setConvertTargets([])}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" /> Convert to Lead
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {convertTargets.length === 1 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Confirm conversion of <span className="font-semibold text-foreground">{convertTargets[0].name}</span> to a Lead.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor={`budget-${convertTargets[0].id}`}>Budget <span className="text-destructive">*</span></Label>
                  <Input id={`budget-${convertTargets[0].id}`} placeholder="e.g. ₹50L – ₹80L"
                    value={budgets[convertTargets[0].id] ?? ""}
                    onChange={(e) => {
                      setBudgets((b) => ({ ...b, [convertTargets[0].id]: e.target.value }));
                      setBudgetErrors((er) => ({ ...er, [convertTargets[0].id]: "" }));
                    }} />
                  {budgetErrors[convertTargets[0].id] && <p className="text-xs text-destructive">{budgetErrors[convertTargets[0].id]}</p>}
                </div>
                <div className="pt-2 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verified By</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="verifier-name">Verifier Name <span className="text-destructive">*</span></Label>
                    <Input id="verifier-name" placeholder="Enter verifier's full name"
                      value={verifierName}
                      onChange={(e) => { setVerifierName(e.target.value); setVerifierErrors((er) => ({ ...er, name: undefined })); }} />
                    {verifierErrors.name && <p className="text-xs text-destructive">{verifierErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="verifier-mobile">Verifier Mobile No. <span className="text-destructive">*</span></Label>
                    <Input id="verifier-mobile" placeholder="Enter verifier's mobile number"
                      value={verifierMobile}
                      onChange={(e) => { setVerifierMobile(e.target.value); setVerifierErrors((er) => ({ ...er, mobile: undefined })); }} />
                    {verifierErrors.mobile && <p className="text-xs text-destructive">{verifierErrors.mobile}</p>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Set a budget for each of the <span className="font-semibold text-foreground">{convertTargets.length} enquiries</span> being converted.
                </p>
                <div className="space-y-3">
                  {convertTargets.map((e) => (
                    <div key={e.id} className="space-y-1.5">
                      <Label htmlFor={`budget-${e.id}`}>
                        <span className="font-medium text-foreground">{e.name}</span>
                        <span className="text-muted-foreground text-xs ml-1">({e.phone})</span>
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Input id={`budget-${e.id}`} placeholder="e.g. ₹50L – ₹80L"
                        value={budgets[e.id] ?? ""}
                        onChange={(ev) => {
                          setBudgets((b) => ({ ...b, [e.id]: ev.target.value }));
                          setBudgetErrors((er) => ({ ...er, [e.id]: "" }));
                        }} />
                      {budgetErrors[e.id] && <p className="text-xs text-destructive">{budgetErrors[e.id]}</p>}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verified By</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="verifier-name">Verifier Name <span className="text-destructive">*</span></Label>
                    <Input id="verifier-name" placeholder="Enter verifier's full name"
                      value={verifierName}
                      onChange={(e) => { setVerifierName(e.target.value); setVerifierErrors((er) => ({ ...er, name: undefined })); }} />
                    {verifierErrors.name && <p className="text-xs text-destructive">{verifierErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="verifier-mobile">Verifier Mobile No. <span className="text-destructive">*</span></Label>
                    <Input id="verifier-mobile" placeholder="Enter verifier's mobile number"
                      value={verifierMobile}
                      onChange={(e) => { setVerifierMobile(e.target.value); setVerifierErrors((er) => ({ ...er, mobile: undefined })); }} />
                    {verifierErrors.mobile && <p className="text-xs text-destructive">{verifierErrors.mobile}</p>}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertTargets([])}>Cancel</Button>
            <Button onClick={handleConvert} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <UserCheck className="h-3.5 w-3.5" /> Convert to Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
