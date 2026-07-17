import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, ChevronDown, Check, Building2, Zap, Calendar, Users, Coins, IndianRupee, Pencil } from "lucide-react";
import { plansService, type Plan, type CreatePlanPayload } from "@/services/plansService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = ["Weekly", "Monthly", "Yearly"] as const;
const TYPE_OPTIONS   = ["Free", "Paid"] as const;

const ROLE_OPTIONS = [
  { id: import.meta.env.VITE_OWNER_ROLE,   label: "Owner" },
  { id: import.meta.env.VITE_BROKER_ROLE,  label: "Broker" },
  { id: import.meta.env.VITE_BUILDER_ROLE, label: "Builder" },
];

function roleLabel(id: string) {
  return ROLE_OPTIONS.find((r) => r.id === id)?.label ?? id;
}

const defaultForm = (): CreatePlanPayload => ({
  name: "", description: "", planType: "Free",
  numberOfPropertiesGiven: 0, leadsPerDay: 0,
  roles: [], isActive: true,
  expiryType: undefined, coins: undefined, amount: undefined,
});

function PlanCard({ plan, onToggle, onEdit }: { plan: Plan; onToggle: (plan: Plan) => void; onEdit: (plan: Plan) => void }) {
  const isPaid = plan.planType === "Paid";

  return (
    <div className={cn(
      "relative rounded-2xl border bg-card p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow",
      isPaid && "border-primary/40 bg-gradient-to-br from-primary/5 to-card"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground leading-tight">{plan.name}</h3>
          {plan.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
          )}
        </div>
        {isPaid && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-primary">Paid</p>
          </div>
        )}
        {!isPaid && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-green-600">Free</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Features */}
      <ul className="space-y-2.5">
        <FeatureRow icon={Building2} label={`${plan.numberOfPropertiesGiven} Properties`} />
        <FeatureRow icon={Zap}       label={`${plan.leadsPerDay} Leads / Day`} />
        {isPaid && plan.expiryType && (
          <FeatureRow icon={Calendar} label={`${plan.expiryType} Validity`} />
        )}
        {isPaid && (plan.amount != null || plan.coins != null) && (
          <FeatureRow
            icon={IndianRupee}
            label={
              plan.amount && plan.coins ? `₹${plan.amount} or ${plan.coins} Coins` :
              plan.amount              ? `₹${plan.amount}` :
                                         `${plan.coins} Coins`
            }
          />
        )}
        {plan.roles.length > 0 && (
          <FeatureRow icon={Users} label={`For: ${plan.roles.map(roleLabel).join(", ")}`} />
        )}
      </ul>

      {/* Divider */}
      <div className="border-t" />

      {/* Is Active Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Active</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Switch
            checked={plan.isActive}
            onCheckedChange={() => onToggle(plan)}
            className="scale-90"
          />
          <span className={cn("text-xs font-medium", plan.isActive ? "text-green-600" : "text-muted-foreground")}>
            {plan.isActive ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex flex-col items-end text-[10px] text-muted-foreground">
        <span>Created: {new Date(plan.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</span>
        <span>Updated: {new Date(plan.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</span>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-foreground">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-3 w-3 text-primary" />
      </span>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span>{label}</span>
    </li>
  );
}

export default function PlansPage() {
  const { toast } = useToast();

  const [plans, setPlans]           = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Free" | "Paid">("All");

  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget]  = useState<Plan | null>(null);
  const [form, setForm]              = useState<CreatePlanPayload>(defaultForm());
  const [errors, setErrors]          = useState<Record<string, string>>({});
  const [submitting, setSubmitting]  = useState(false);

  function buildParams(tf = typeFilter, q = search) {
    const p: Record<string, string> = {};
    if (tf !== "All") p.planType = tf;
    if (q.trim())     p.search   = q.trim();
    return p;
  }

  async function fetchPlans(tf = typeFilter, q = search) {
    setLoading(true);
    try {
      const res = await plansService.getAll(buildParams(tf, q));
      setPlans(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load plans" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPlans("All", ""); }, []);

  function openEdit(plan: Plan) {
    setEditTarget(plan);
    setForm({
      name:                    plan.name,
      description:             plan.description ?? "",
      planType:                plan.planType,
      numberOfPropertiesGiven: plan.numberOfPropertiesGiven,
      leadsPerDay:             plan.leadsPerDay,
      roles:                   plan.roles,
      isActive:                plan.isActive,
      expiryType:              plan.expiryType,
      coins:                   plan.coins,
      amount:                  plan.amount,
    });
    setErrors({});
    setOpen(true);
  }

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm());
    setErrors({});
    setOpen(true);
  }

  function set<K extends keyof CreatePlanPayload>(key: K, val: CreatePlanPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())                        e.name  = "Name is required";
    if (!form.roles?.length)                       e.roles = "Select at least one role";
    if (form.numberOfPropertiesGiven <= 0)         e.numberOfPropertiesGiven = "Must be greater than 0";
    if (form.leadsPerDay <= 0)                     e.leadsPerDay = "Must be greater than 0";
    if (form.planType === "Paid") {
      if (!form.expiryType)                         e.expiryType = "Required for Paid plans";
      if ((!form.coins  || form.coins  <= 0) &&
          (!form.amount || form.amount <= 0))        e.coins = "Set at least coins or amount (must be > 0)";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await plansService.update(editTarget._id, form);
        setPlans((prev) => prev.map((p) => p._id === editTarget._id ? res.data.data : p));
        toast({ title: "Plan updated successfully" });
      } else {
        const res = await plansService.create(form);
        setPlans((prev) => [res.data.data, ...prev]);
        toast({ title: "Plan created successfully" });
      }
      setOpen(false);
      setForm(defaultForm());
      setEditTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.toLowerCase().includes("already exists")) {
        setErrors({ name: "Plan name already exists" });
      } else {
        toast({ variant: "destructive", title: msg || "Something went wrong" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      const res = await plansService.toggleActive(plan._id);
      setPlans((prev) => prev.map((p) => p._id === plan._id ? res.data.data : p));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  const isPaid = form.planType === "Paid";

  const freePlans = plans.filter((p) => p.planType === "Free");
  const paidPlans = plans.filter((p) => p.planType === "Paid");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plans Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage subscription plans for your users.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search plans..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchPlans(typeFilter, e.target.value); }}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 text-muted-foreground">
              Type: {typeFilter} <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["All", "Free", "Paid"] as const).map((t) => (
              <DropdownMenuItem key={t} onClick={() => { setTypeFilter(t); fetchPlans(t, search); }}>{t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <Spinner fullPage={false} size="md" label="Loading plans..." />
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <p className="text-base font-medium">No plans found</p>
          <p className="text-sm">Create your first plan to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {paidPlans.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Paid Plans</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paidPlans.map((p) => <PlanCard key={p._id} plan={p} onToggle={toggleActive} onEdit={openEdit} />)}
              </div>
            </div>
          )}
          {freePlans.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Free Plans</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {freePlans.map((p) => <PlanCard key={p._id} plan={p} onToggle={toggleActive} onEdit={openEdit} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Plan" : "Add Plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Plan Type */}
            <div className="space-y-1.5">
              <Label>Plan Type <span className="text-destructive">*</span></Label>
              <Select value={form.planType} onValueChange={(v) => set("planType", v as "Free" | "Paid")}>
                <SelectTrigger><SelectValue placeholder="Select plan type" /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Basic, Pro, Enterprise" value={form.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description of the plan..." value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="resize-none" />
            </div>

            {/* Properties & Leads */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Properties Given <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} placeholder="0" value={form.numberOfPropertiesGiven || ""} onChange={(e) => set("numberOfPropertiesGiven", Number(e.target.value))} />
                {errors.numberOfPropertiesGiven && <p className="text-xs text-destructive">{errors.numberOfPropertiesGiven}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Leads / Day <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} placeholder="0" value={form.leadsPerDay || ""} onChange={(e) => set("leadsPerDay", Number(e.target.value))} />
                {errors.leadsPerDay && <p className="text-xs text-destructive">{errors.leadsPerDay}</p>}
              </div>
            </div>

            {/* Paid-only fields */}
            {isPaid && (
              <>
                <div className="space-y-1.5">
                  <Label>Expiry Type <span className="text-destructive">*</span></Label>
                  <Select value={form.expiryType ?? ""} onValueChange={(v) => set("expiryType", v as any)}>
                    <SelectTrigger><SelectValue placeholder="Select expiry" /></SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.expiryType && <p className="text-xs text-destructive">{errors.expiryType}</p>}
                </div>

                  <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Coins</Label>
                    <Input type="number" min={1} placeholder="Not set" value={form.coins ?? ""} onChange={(e) => set("coins", e.target.value === "" ? undefined : Number(e.target.value))} />
                    {errors.coins && <p className="text-xs text-destructive">{errors.coins}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount (₹)</Label>
                    <Input type="number" min={1} placeholder="Not set" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value === "" ? undefined : Number(e.target.value))} />
                    {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Roles */}
            <div className="space-y-1.5">
              <Label>Visible To <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-4 rounded-lg border p-3">
                {ROLE_OPTIONS.map((r) => {
                  const checked = form.roles?.includes(r.id) ?? false;
                  return (
                    <label key={r.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const current = form.roles ?? [];
                          set("roles", v ? [...current, r.id] : current.filter((x) => x !== r.id));
                        }}
                      />
                      <span className="text-sm text-foreground">{r.label}</span>
                    </label>
                  );
                })}
              </div>
              {errors.roles && <p className="text-xs text-destructive">{errors.roles}</p>}
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between">
              <Label>Is Active</Label>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
                <span className={cn("text-xs font-medium", form.isActive ? "text-green-600" : "text-muted-foreground")}>
                  {form.isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (editTarget ? "Updating..." : "Creating...") : editTarget ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
