import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Spinner from "@/components/Spinner";
import { Settings2 } from "lucide-react";
import { gstConfigService, type GstConfig } from "@/services/gstConfigService";

const formatIST = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

export default function GstConfigPage() {
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig]         = useState<GstConfig | null>(null);
  const [form, setForm]             = useState({ cgst: "", sgst: "", igst: "" });

  useEffect(() => {
    gstConfigService.get()
      .then((res) => {
        const data = res.data.data;
        setConfig(data);
        if (data) setForm({ cgst: String(data.cgst), sgst: String(data.sgst), igst: String(data.igst) });
      })
      .catch(() => toast.error("Failed to load GST config"))
      .finally(() => setLoading(false));
  }, []);

  const activeMode = (): "cgst_sgst" | "igst" | "none" => {
    if (!config) return "none";
    if (config.igst > 0) return "igst";
    if (config.cgst > 0 || config.sgst > 0) return "cgst_sgst";
    return "none";
  };

  const handleSave = async () => {
    const cgst = form.cgst !== "" ? Number(form.cgst) : undefined;
    const sgst = form.sgst !== "" ? Number(form.sgst) : undefined;
    const igst = form.igst !== "" ? Number(form.igst) : undefined;

    if (cgst !== undefined && (isNaN(cgst) || cgst < 0 || cgst > 100)) { toast.error("CGST must be between 0 and 100"); return; }
    if (sgst !== undefined && (isNaN(sgst) || sgst < 0 || sgst > 100)) { toast.error("SGST must be between 0 and 100"); return; }
    if (igst !== undefined && (isNaN(igst) || igst < 0 || igst > 100)) { toast.error("IGST must be between 0 and 100"); return; }

    if (cgst === undefined && sgst === undefined && igst === undefined) { toast.error("Fill at least one field to update"); return; }

    if (igst !== undefined && igst > 0 && ((cgst !== undefined && cgst > 0) || (sgst !== undefined && sgst > 0))) {
      toast.error("IGST cannot be set together with CGST or SGST"); return;
    }

    const payload: Record<string, number> = {};
    if (cgst !== undefined) payload.cgst = cgst;
    if (sgst !== undefined) payload.sgst = sgst;
    if (igst !== undefined) payload.igst = igst;

    setSubmitting(true);
    try {
      const res = await gstConfigService.update(payload);
      setConfig(res.data.data);
      toast.success("GST config saved successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save GST config");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullPage={false} size="md" label="Loading GST config..." />;

  const mode = activeMode();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">GST Configuration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure CGST + SGST or IGST applied on payments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Current Config */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Current Configuration</p>
            </div>

            {!config ? (
              <p className="text-sm text-muted-foreground">No GST config set yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">CGST</span>
                  <span className={`text-sm font-semibold ${config.cgst > 0 ? "text-foreground" : "text-muted-foreground"}`}>{config.cgst}%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">SGST</span>
                  <span className={`text-sm font-semibold ${config.sgst > 0 ? "text-foreground" : "text-muted-foreground"}`}>{config.sgst}%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">IGST</span>
                  <span className={`text-sm font-semibold ${config.igst > 0 ? "text-foreground" : "text-muted-foreground"}`}>{config.igst}%</span>
                </div>

                <div className={`rounded-lg px-4 py-2 text-xs font-medium ${
                  mode === "cgst_sgst" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  mode === "igst"      ? "bg-purple-50 text-purple-700 border border-purple-200" :
                                        "bg-muted text-muted-foreground border"
                }`}>
                  {mode === "cgst_sgst" && `Active: CGST (${config.cgst}%) + SGST (${config.sgst}%) = ${config.cgst + config.sgst}%`}
                  {mode === "igst"      && `Active: IGST (${config.igst}%)`}
                  {mode === "none"      && "No tax active (all set to 0)"}
                </div>

                {config.updatedAt && (
                  <p className="text-[11px] text-muted-foreground">Last updated: {formatIST(config.updatedAt)}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold mb-2">Update GST Values</p>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Use either <strong>CGST + SGST</strong> or <strong>IGST</strong> — not both. Leave unused fields empty.
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>CGST %</Label>
                <Input
                  type="number" min={0} max={100} placeholder="0"
                  value={form.cgst}
                  onChange={(e) => setForm((p) => ({ ...p, cgst: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>SGST %</Label>
                <Input
                  type="number" min={0} max={100} placeholder="0"
                  value={form.sgst}
                  onChange={(e) => setForm((p) => ({ ...p, sgst: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>IGST %</Label>
                <Input
                  type="number" min={0} max={100} placeholder="0"
                  value={form.igst}
                  onChange={(e) => setForm((p) => ({ ...p, igst: e.target.value }))}
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving..." : config ? "Update GST Config" : "Save GST Config"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
