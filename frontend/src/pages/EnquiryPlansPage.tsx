import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Check, MessageSquare, Calendar, Users, IndianRupee, Pencil, Trash2 } from "lucide-react";
import { enquiryPlansService, type EnquiryPlan, type CreateEnquiryPlanPayload } from "@/services/enquiryPlansService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { id: import.meta.env.VITE_OWNER_ROLE,   label: "Owner" },
  { id: import.meta.env.VITE_BROKER_ROLE,  label: "Broker" },
  { id: import.meta.env.VITE_BUILDER_ROLE, label: "Builder" },
];

function roleLabel(id: string) {
  return ROLE_OPTIONS.find((r) => r.id === id)?.label ?? id;
}

const defaultForm = (): CreateEnquiryPlanPayload => ({
  name: "", description: "",
  numberOfEnquiriesGiven: 0,
  roles: [], isActive: true,
  expiryInDays: -1, coins: 0, amount: 0,
});

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan, onToggle, onEdit, onDelete,
}: {
  plan: EnquiryPlan;
  onToggle: (plan: EnquiryPlan) => void;
  onEdit:   (plan: EnquiryPlan) => void;
  onDelete: (plan: EnquiryPlan) => void;
}) {
  return (
    <div className="relative rounded-2xl border bg-card p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground leading-tight">{plan.name}</h3>
          {plan.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(plan)}
          className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors shrink-0"
          title="Delete plan"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t" />

      {/* Features */}
      <ul className="space-y-2.5">
        <FeatureRow
          icon={MessageSquare}
          label={plan.numberOfEnquiriesGiven === -1 ? "Unlimited Enquiries" : `${plan.numberOfEnquiriesGiven} Enquiries`}
        />
        {plan.expiryInDays != null && (
          <FeatureRow
            icon={Calendar}
            label={plan.expiryInDays === -1 ? "Never expires" : `Valid for ${plan.expiryInDays} day${plan.expiryInDays === 1 ? "" : "s"}`}
          />
        )}
        {plan.coins != null && plan.amount != null && (
          <FeatureRow
            icon={IndianRupee}
            label={
              plan.coins === 0 && plan.amount === 0
                ? "Free"
                : `₹${plan.amount} or ${plan.coins} Coins`
            }
          />
        )}
        {plan.roles.length > 0 && (
          <FeatureRow icon={Users} label={`For: ${plan.roles.map(roleLabel).join(", ")}`} />
        )}
      </ul>

      <div className="border-t" />

      {/* Active toggle + edit */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Active</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Switch checked={plan.isActive} onCheckedChange={() => onToggle(plan)} className="scale-90" />
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EnquiryPlansPage() {
  const { toast } = useToast();

  const [plans, setPlans]           = useState<EnquiryPlan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState<EnquiryPlan | null>(null);
  const [form, setForm]             = useState<CreateEnquiryPlanPayload>(defaultForm());
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<EnquiryPlan | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  async function fetchPlans(q = search) {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.search = q.trim();
      const res = await enquiryPlansService.getAll(params);
      setPlans(res.data.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load enquiry plans" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPlans(""); }, []);

  function openEdit(plan: EnquiryPlan) {
    setEditTarget(plan);
    setForm({
      name:                    plan.name,
      description:             plan.description ?? "",
      numberOfEnquiriesGiven:  plan.numberOfEnquiriesGiven,
      roles:                   plan.roles,
      isActive:                plan.isActive,
      expiryInDays:            plan.expiryInDays ?? -1,
      coins:                   plan.coins  ?? 0,
      amount:                  plan.amount ?? 0,
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

  function set<K extends keyof CreateEnquiryPlanPayload>(key: K, val: CreateEnquiryPlanPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};

    if (!form.name.trim()) e.name = "Name is required";

    if (!form.roles?.length) e.roles = "Select at least one role";

    if (form.numberOfEnquiriesGiven !== -1 && form.numberOfEnquiriesGiven <= 0)
      e.numberOfEnquiriesGiven = "Must be greater than 0, or -1 for unlimited";

    const expiry = Number(form.expiryInDays);
    if (form.expiryInDays == null || isNaN(expiry) || expiry === 0 || expiry < -1)
      e.expiryInDays = "Expiry must be -1 (no expiry) or a positive number of days";

    const coinsVal  = Number(form.coins);
    const amountVal = Number(form.amount);
    if (isNaN(coinsVal)  || coinsVal  < 0) e.coins  = "Coins cannot be negative";
    if (isNaN(amountVal) || amountVal < 0) e.amount = "Amount cannot be negative";
    if (!e.coins && !e.amount && (coinsVal === 0) !== (amountVal === 0))
      e.coins = "Both coins and amount must be 0 (free) or both greater than 0 (paid)";

    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await enquiryPlansService.update(editTarget._id, form);
        setPlans((prev) => prev.map((p) => p._id === editTarget._id ? res.data.data : p));
        toast({ title: "Plan updated successfully" });
      } else {
        const res = await enquiryPlansService.create(form);
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

  async function toggleActive(plan: EnquiryPlan) {
    try {
      const res = await enquiryPlansService.toggleActive(plan._id);
      setPlans((prev) => prev.map((p) => p._id === plan._id ? res.data.data : p));
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  function openDelete(plan: EnquiryPlan) { setDeleteTarget(plan); setDeleteOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await enquiryPlansService.delete(deleteTarget._id);
      setPlans((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast({ title: "Plan deleted successfully" });
      setDeleteOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete plan" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enquiry Plans Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage enquiry plans for your users.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Plan
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search plans..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchPlans(e.target.value); }}
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <Spinner fullPage={false} size="md" label="Loading enquiry plans..." />
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <p className="text-base font-medium">No enquiry plans found</p>
          <p className="text-sm">Create your first plan to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.map((p) => (
            <PlanCard key={p._id} plan={p} onToggle={toggleActive} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Enquiry Plan" : "Add Enquiry Plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
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

            {/* Enquiries Given */}
            <div className="space-y-1.5">
              <Label>Enquiries Given <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={-1}
                placeholder="0"
                value={form.numberOfEnquiriesGiven || ""}
                onChange={(e) => set("numberOfEnquiriesGiven", Number(e.target.value))}
              />
              {errors.numberOfEnquiriesGiven && <p className="text-xs text-destructive">{errors.numberOfEnquiriesGiven}</p>}
              <p className="text-xs text-muted-foreground">Use <strong>-1</strong> for unlimited enquiries, or enter a positive number.</p>
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <Label>
                Expiry (days) <span className="text-destructive">*</span>{" "}
                <span className="text-muted-foreground text-xs">(-1 = no expiry, or enter days &gt; 0)</span>
              </Label>
              <Input
                type="number"
                placeholder="-1"
                value={form.expiryInDays ?? ""}
                onChange={(e) => set("expiryInDays", e.target.value === "" ? undefined as any : Number(e.target.value))}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!isNaN(v) && v !== -1 && v <= 0) set("expiryInDays", -1);
                }}
              />
              {errors.expiryInDays && <p className="text-xs text-destructive">{errors.expiryInDays}</p>}
              <p className="text-xs text-muted-foreground">Use <strong>-1</strong> for plans that never expire, or enter a positive number for expiry days.</p>
            </div>

            {/* Coins & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Coins <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.coins ?? ""}
                  onChange={(e) => set("coins", e.target.value === "" ? 0 : Number(e.target.value))}
                />
                {errors.coins && <p className="text-xs text-destructive">{errors.coins}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.amount ?? ""}
                  onChange={(e) => set("amount", e.target.value === "" ? 0 : Number(e.target.value))}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Set both to <strong>0</strong> for a free plan, or both to a value greater than 0 for a paid plan.
            </p>

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
              {submitting
                ? editTarget ? "Updating..." : "Creating..."
                : editTarget ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Enquiry Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
