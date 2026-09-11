import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins } from "lucide-react";
import { leadEnquiryCoinsConfigService } from "@/services/leadEnquiryCoinsConfigService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

export default function LeadEnquiryCoinsConfigPage() {
  const { toast } = useToast();

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [form, setForm] = useState({
    coinsPerLead:    "0",
    coinsPerEnquiry: "0",
  });

  const [errors, setErrors] = useState({
    coinsPerLead:    "",
    coinsPerEnquiry: "",
  });

  // ── Load current config on mount ────────────────────────────────────────────
  useEffect(() => {
    leadEnquiryCoinsConfigService
      .getConfig()
      .then((res) => {
        const d = res.data.data;
        setForm({
          coinsPerLead:    String(d.coinsPerLead),
          coinsPerEnquiry: String(d.coinsPerEnquiry),
        });
        if (d.updatedAt) setLastUpdated(d.updatedAt);
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load config" }))
      .finally(() => setLoading(false));
  }, []);

  function setField(key: "coinsPerLead" | "coinsPerEnquiry", value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e = { coinsPerLead: "", coinsPerEnquiry: "" };
    const lead    = Number(form.coinsPerLead);
    const enquiry = Number(form.coinsPerEnquiry);
    if (form.coinsPerLead === "" || isNaN(lead) || lead < 0)
      e.coinsPerLead = "Must be a non-negative number";
    if (form.coinsPerEnquiry === "" || isNaN(enquiry) || enquiry < 0)
      e.coinsPerEnquiry = "Must be a non-negative number";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.coinsPerLead || errs.coinsPerEnquiry) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await leadEnquiryCoinsConfigService.updateConfig({
        coinsPerLead:    Number(form.coinsPerLead),
        coinsPerEnquiry: Number(form.coinsPerEnquiry),
      });
      if (res.data.data.updatedAt) setLastUpdated(res.data.data.updatedAt);
      toast({ title: "Config saved successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.response?.data?.message || "Failed to save config" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner fullPage={false} size="md" label="Loading config..." />;

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lead & Enquiry Coins Config</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set how many coins are charged per lead and per enquiry.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Coins Configuration</CardTitle>
              <CardDescription className="text-xs">
                These values are applied system-wide when a lead or enquiry is made.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Coins per Lead */}
            <div className="space-y-1.5">
              <Label htmlFor="coinsPerLead">
                Coins per Lead <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="coinsPerLead"
                  type="number"
                  min={0}
                  placeholder="e.g. 10"
                  className="pl-9"
                  value={form.coinsPerLead}
                  onChange={(e) => setField("coinsPerLead", e.target.value)}
                />
              </div>
              {errors.coinsPerLead && (
                <p className="text-xs text-destructive">{errors.coinsPerLead}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Number of coins deducted from a user's wallet each time they view a lead. Set to <strong>0</strong> to make it free.
              </p>
            </div>

            {/* Coins per Enquiry */}
            <div className="space-y-1.5">
              <Label htmlFor="coinsPerEnquiry">
                Coins per Enquiry <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="coinsPerEnquiry"
                  type="number"
                  min={0}
                  placeholder="e.g. 5"
                  className="pl-9"
                  value={form.coinsPerEnquiry}
                  onChange={(e) => setField("coinsPerEnquiry", e.target.value)}
                />
              </div>
              {errors.coinsPerEnquiry && (
                <p className="text-xs text-destructive">{errors.coinsPerEnquiry}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Number of coins deducted from a user's wallet each time they view an enquiry. Set to <strong>0</strong> to make it free.
              </p>
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated:{" "}
                {new Date(lastUpdated).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit", hour12: true,
                  timeZone: "Asia/Kolkata",
                })}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Config"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
