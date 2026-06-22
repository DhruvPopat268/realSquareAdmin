import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home, Building2, TrendingUp, TrendingDown, Users, DollarSign,
  MoreVertical, Mail, MapPin, Tag,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const salesGrowthData = [
  { month: "Jan", revenue: 28, deals: 9 },
  { month: "Feb", revenue: 32, deals: 11 },
  { month: "Mar", revenue: 25, deals: 15 },
  { month: "Apr", revenue: 38, deals: 20 },
  { month: "May", revenue: 45, deals: 27 },
  { month: "Jun", revenue: 52, deals: 34 },
  { month: "Jul", revenue: 48, deals: 30 },
  { month: "Aug", revenue: 55, deals: 36 },
  { month: "Sep", revenue: 60, deals: 40 },
  { month: "Oct", revenue: 68, deals: 45 },
  { month: "Nov", revenue: 58, deals: 38 },
  { month: "Dec", revenue: 50, deals: 32 },
];

const propertyTypeData = [
  { name: "Apartment",   value: 38, color: "hsl(217,91%,60%)" },
  { name: "Villa",       value: 22, color: "hsl(142,71%,45%)" },
  { name: "Townhouse",   value: 18, color: "hsl(38,92%,55%)" },
  { name: "Condominium", value: 14, color: "hsl(280,65%,60%)" },
  { name: "Multi Family",value: 8,  color: "hsl(0,84%,60%)" },
];

const newListings = [
  { img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=80&h=60&fit=crop", price: "$9,370,000", address: "6558 Green Rd.",       type: "Sale",  beds: 4, baths: 3 },
  { img: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=80&h=60&fit=crop", price: "$5,400,000", address: "7529 E. Pecan St.", type: "Rent",  beds: 3, baths: 2 },
  { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=80&h=60&fit=crop", price: "$6,850,000", address: "3890 Poplar Dr.",   type: "Sale",  beds: 5, baths: 4 },
  { img: "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=80&h=60&fit=crop", price: "$3,200,000", address: "221 Baker St.",     type: "Rent",  beds: 2, baths: 1 },
];

const recentTransactions = [
  { buyer: "Ammar ibn Yasir",     initials: "AM", property: "7529 E. Pecan St.",       type: "Sale", price: "$5,200,000", status: "Paid",    agent: "Robert Fox" },
  { buyer: "Abu Talha al-Ansari", initials: "AB", property: "3890 Poplar Dr.",          type: "Rent", price: "$9,750,000", status: "Pending", agent: "Annette Black" },
  { buyer: "Miqdad ibn Aswad",    initials: "MI", property: "3605 Parker Rd.",          type: "Sale", price: "$4,000,000", status: "Paid",    agent: "Kristin Watson" },
  { buyer: "Amir ibn Fuhayra",    initials: "AM", property: "775 Rolling Green Rd.",    type: "Sale", price: "$3,725,000", status: "Paid",    agent: "Jerome Bell" },
  { buyer: "Zayd ibn Harithah",   initials: "ZH", property: "112 Lakeside Ave.",        type: "Rent", price: "$2,100,000", status: "Pending", agent: "Theresa Webb" },
];

const topAgents = [
  { name: "Robert Fox",      deals: 24, revenue: "$18.4M", avatar: "RF" },
  { name: "Annette Black",   deals: 19, revenue: "$14.1M", avatar: "AB" },
  { name: "Kristin Watson",  deals: 17, revenue: "$12.8M", avatar: "KW" },
  { name: "Jerome Bell",     deals: 14, revenue: "$10.5M", avatar: "JB" },
  { name: "Theresa Webb",    deals: 12, revenue: "$9.2M",  avatar: "TW" },
];

const recentLeads = [
  { name: "Shuja ibn Wahb",    type: "Apartment",   status: "New",        time: "2m ago" },
  { name: "Zayd ibn Harithah", type: "Townhouse",   status: "Viewing",    time: "15m ago" },
  { name: "Abu Bakr",          type: "Apartment",   status: "Closed Won", time: "1h ago" },
  { name: "Uthman ibn Hunaif", type: "Townhouse",   status: "Assigned",   time: "2h ago" },
  { name: "Bilal ibn Rabah",   type: "Villa",       status: "New",        time: "3h ago" },
];

const statCards = [
  { label: "Total Properties", value: "59",    change: "+0.38%", up: true,  icon: Home,      sub: "Active listings" },
  { label: "For Sale",         value: "23",    change: "+4.3%",  up: true,  icon: Tag,       sub: "On market" },
  { label: "For Rent",         value: "36",    change: "-0.12%", up: false, icon: Building2, sub: "Available units" },
  { label: "New Leads",        value: "320",   change: "+0.38%", up: true,  icon: Users,     sub: "This month" },
  { label: "Total Revenue",    value: "$52M",  change: "+8.1%",  up: true,  icon: DollarSign,sub: "YTD" },
  { label: "Deals Closed",     value: "148",   change: "+5.2%",  up: true,  icon: TrendingUp,sub: "This year" },
];

const leadStatusStyle: Record<string, string> = {
  New:        "bg-blue-50 text-blue-600 border border-blue-200",
  Viewing:    "bg-amber-50 text-amber-600 border border-amber-200",
  Assigned:   "bg-green-50 text-green-600 border border-green-200",
  "Closed Won":"bg-red-50 text-red-500 border border-red-200",
};

const txStatusStyle: Record<string, string> = {
  Paid:    "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
};

function Avatar({ initials }: { initials: string }) {
  const colors: Record<string, string> = {
    A: "bg-orange-100 text-orange-600", Z: "bg-purple-100 text-purple-600",
    M: "bg-pink-100 text-pink-600",     R: "bg-blue-100 text-blue-600",
    K: "bg-teal-100 text-teal-600",     J: "bg-indigo-100 text-indigo-600",
    T: "bg-red-100 text-red-600",       S: "bg-green-100 text-green-600",
    B: "bg-yellow-100 text-yellow-600",
  };
  const c = colors[initials[0]] ?? "bg-gray-100 text-gray-600";
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${c}`}>
      {initials}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState<"Weekly" | "Monthly" | "Yearly">("Yearly");

  const PeriodToggle = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center gap-0.5 bg-muted rounded-lg p-1 ${className}`}>
      {(["Weekly", "Monthly", "Yearly"] as const).map((p) => (
        <button key={p} onClick={() => setPeriod(p)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            period === p ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}>{p}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back — here's what's happening today.</p>
        </div>
        <PeriodToggle />
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <s.icon className="h-4.5 w-4.5 text-primary" style={{ height: 18, width: 18 }} />
              </div>
              <p className="text-muted-foreground text-xs">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
              <div className="flex items-center gap-1 mt-1.5">
                {s.up
                  ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                  : <TrendingDown className="h-3 w-3 text-red-500" />}
                <span className={`text-[11px] font-medium ${s.up ? "text-emerald-500" : "text-red-500"}`}>{s.change}</span>
                <span className="text-[11px] text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Row 2: Sales Growth + Property Type ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Revenue & Deals Growth</CardTitle>
              <PeriodToggle />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={salesGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} className="text-xs"
                  tickFormatter={(v) => `$${v}M`} width={45} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                  className="text-xs" width={30} />
                <Tooltip formatter={(v: number, name: string) =>
                  name === "revenue" ? [`$${v}M`, "Revenue"] : [v, "Deals"]} />
                <Bar yAxisId="left" dataKey="revenue" fill="hsl(217,91%,85%)" radius={[4,4,0,0]} name="revenue" />
                <Line yAxisId="right" type="monotone" dataKey="deals" stroke="hsl(217,91%,50%)"
                  strokeWidth={2} dot={false} name="deals" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Property Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={propertyTypeData} cx="50%" cy="45%" innerRadius={55}
                  outerRadius={85} paddingAngle={3} dataKey="value">
                  {propertyTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: New Listings + Recent Leads ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* New Listings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">New Listings</CardTitle>
              <button className="text-xs text-primary font-medium hover:underline">View All</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {newListings.map((p) => (
              <div key={p.address} className="flex items-center gap-3">
                <img src={p.img} alt={p.address}
                  className="h-14 w-20 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.price}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />{p.address}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{p.beds} beds</span><span>{p.baths} baths</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      p.type === "Sale" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                    }`}>{p.type}</span>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
              <button className="text-xs text-primary font-medium hover:underline">View All</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.map((l) => (
              <div key={l.name} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                <Avatar initials={l.name.slice(0, 2).toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.type}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${leadStatusStyle[l.status]}`}>
                  {l.status}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{l.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Recent Transactions + Top Agents ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Transactions */}
        <Card className="border-0 shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <PeriodToggle />
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 font-medium">Buyer</th>
                  <th className="pb-2 font-medium">Property</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Agent</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((r) => (
                  <tr key={r.buyer + r.property} className="border-b last:border-0">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar initials={r.initials} />
                        <span className="font-medium text-foreground text-xs">{r.buyer}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground text-xs">{r.property}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{r.type}</td>
                    <td className="py-2.5 font-medium text-foreground text-xs">{r.price}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{r.agent}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${txStatusStyle[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Top Agents</CardTitle>
              <button className="text-xs text-primary font-medium hover:underline">View All</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topAgents.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold
                  ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                  {a.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.deals} deals</p>
                </div>
                <span className="text-xs font-semibold text-foreground shrink-0">{a.revenue}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
