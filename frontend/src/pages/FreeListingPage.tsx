import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { List, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axiosInterceptor";
import Spinner from "@/components/Spinner";

export default function FreeListingPage() {
  const [noOfListings, setNoOfListings] = useState<string>("");
  const [fetching, setFetching]         = useState(true);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    api.get("/admin/free-listing-config")
      .then((res) => {
        if (res.data.data?.noOfListings != null)
          setNoOfListings(String(res.data.data.noOfListings));
      })
      .catch(() => toast.error("Failed to load free listing config"))
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    const value = Number(noOfListings);
    if (noOfListings === "" || isNaN(value) || (value < 0 && value !== -1))
      return toast.error("Please enter a valid number (0 or greater), or -1 for unlimited");

    setSaving(true);
    try {
      await api.put("/admin/free-listing-config", { noOfListings: value });
      toast.success("Free listing config saved successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Free Listings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set how many free listings are available to users
        </p>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-3">
        <List className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          This value controls the number of <strong>free listings</strong> a user can post.
          Set to <strong>0</strong> to disable free listings entirely.
          Set to <strong>-1</strong> for <strong>unlimited</strong> free listings.
        </p>
      </div>

      {/* Config card */}
      <div className="rounded-xl border bg-card p-6 max-w-sm shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
            <List className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Free Listings Allowed</p>
            <p className="text-xs text-muted-foreground">Number of listings available for free</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="noOfListings">Number of Free Listings</Label>
          <Input
            id="noOfListings"
            type="number"
            min={-1}
            value={noOfListings}
            onChange={(e) => setNoOfListings(e.target.value)}
            placeholder="e.g. 3, or -1 for unlimited"
            className="w-full"
          />
          {noOfListings === "-1" && (
            <p className="text-xs font-medium text-green-600">✓ Unlimited free listings enabled</p>
          )}
          {noOfListings === "0" && (
            <p className="text-xs font-medium text-red-500">✗ Free listings disabled</p>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
