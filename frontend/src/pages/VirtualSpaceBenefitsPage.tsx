import { useEffect, useState } from "react";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import BenefitsEditor from "@/components/BenefitsEditor";
import {
  virtualSpaceBenefitsService,
  type VirtualSpaceBenefits,
} from "@/services/virtualSpaceBenefitsService";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/Spinner";

export default function VirtualSpaceBenefitsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<VirtualSpaceBenefits[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VirtualSpaceBenefits | null>(null);
  const [title, setTitle] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(query = search) {
    setLoading(true);

    try {
      const params = query.trim() ? { search: query.trim() } : undefined;
      const response = await virtualSpaceBenefitsService.getAll(params);
      setItems(response.data.data);
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to load virtual space benefits",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  function create() {
    setEditing(null);
    setTitle("");
    setBenefits([]);
    setIsActive(true);
    setOpen(true);
  }

  function edit(item: VirtualSpaceBenefits) {
    setEditing(item);
    setTitle(item.title);
    setBenefits(item.benefits);
    setIsActive(item.isActive);
    setOpen(true);
  }

  async function save() {
    const normalizedBenefits = [
      ...new Set(
        benefits
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];

    if (!title.trim() || !normalizedBenefits.length) {
      toast({
        variant: "destructive",
        title: "Enter a title and at least one benefit",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        benefits: normalizedBenefits,
        isActive,
      };
      if (editing) {
        await virtualSpaceBenefitsService.update(editing._id, payload);
      } else {
        await virtualSpaceBenefitsService.create(payload);
      }

      setOpen(false);
      await load();
      toast({ title: editing ? "Benefits updated" : "Benefits created" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not save benefits",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: VirtualSpaceBenefits) {
    try {
      const result = await virtualSpaceBenefitsService.update(item._id, {
        isActive: !item.isActive,
      });
      setItems((current) =>
        current.map((entry) =>
          entry._id === item._id ? result.data.data : entry,
        ),
      );
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }

  async function remove(item: VirtualSpaceBenefits) {
    if (!window.confirm(`Delete benefits titled “${item.title}”?`)) return;

    try {
      await virtualSpaceBenefitsService.remove(item._id);
      setItems((current) => current.filter((entry) => entry._id !== item._id));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Failed to delete benefits",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Virtual Space Benefits</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage choices available when listing a virtual coworking space.
          </p>
        </div>
        <Button size="sm" onClick={create}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Benefits
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search titles..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            void load(event.target.value);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Benefits</th>
              <th className="p-3 text-left">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <Spinner size="md" label="Loading benefits..." />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No virtual space benefits found
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item._id} className="border-t align-top">
                  <td className="p-3 text-muted-foreground">{index + 1}</td>
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3">
                    {item.benefits.map((benefit) => (
                      <span
                        key={benefit}
                        className="mr-1.5 mb-1 inline-block rounded-full bg-muted px-2 py-1 text-xs"
                      >
                        {benefit}
                      </span>
                    ))}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => void toggle(item)}
                      />
                      <span className="text-xs">
                        {item.isActive ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => edit(item)}
                      aria-label="Edit benefits"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(item)}
                      aria-label="Delete benefits"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Virtual Space Benefits" : "Add Virtual Space Benefits"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="vs-title">Title</Label>
              <Input
                id="vs-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Standard Virtual Office"
              />
            </div>
            <BenefitsEditor benefits={benefits} onChange={setBenefits} />
            <div className="flex items-center justify-between">
              <Label htmlFor="vs-active">Is Active</Label>
              <Switch
                id="vs-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
