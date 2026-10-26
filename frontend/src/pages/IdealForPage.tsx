import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Spinner from "@/components/Spinner";
import { useToast } from "@/hooks/use-toast";
import { idealForService, type IdealForOption } from "@/services/idealForService";

export default function IdealForPage() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<IdealForOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IdealForOption | null>(null);
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<IdealForOption | null>(null);

  async function fetchItems() {
    setLoading(true);
    try {
      const response = await idealForService.getAll();
      setItems(response.data.data);
    } catch (error: any) {
      toast({ variant: "destructive", title: error?.response?.data?.message || "Failed to load Ideal For options" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(""); }, []);

  function openCreate() {
    setEditTarget(null); setName(""); setImageFile(null); setImagePreview(""); setIsActive(true); setOpen(true);
  }

  function openEdit(item: IdealForOption) {
    setEditTarget(item); setName(item.name); setImageFile(null); setImagePreview(item.image); setIsActive(item.isActive); setOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (!editTarget && !imageFile) {
      toast({ variant: "destructive", title: "Image is required" });
      return;
    }
    setSubmitting(true);
    try {
      if (editTarget) await idealForService.update(editTarget._id, { name: name.trim(), isActive, image: imageFile });
      else await idealForService.create({ name: name.trim(), isActive, image: imageFile! });
      setOpen(false);
      toast({ title: editTarget ? "Ideal For option updated" : "Ideal For option created" });
      await fetchItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: error?.response?.data?.message || "Unable to save Ideal For option" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: IdealForOption) {
    try {
      const response = await idealForService.update(item._id, { isActive: !item.isActive });
      setItems((current) => current.map((entry) => entry._id === item._id ? response.data.data : entry));
    } catch (error: any) {
      toast({ variant: "destructive", title: error?.response?.data?.message || "Failed to update status" });
    }
  }

  async function reorder(item: IdealForOption, direction: "up" | "down") {
    try {
      const response = await idealForService.reorder(item._id, direction);
      setItems(response.data.data);
    } catch (error: any) {
      toast({ variant: "destructive", title: error?.response?.data?.message || "Failed to reorder options" });
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await idealForService.remove(deleting._id);
      setDeleting(null);
      toast({ title: "Ideal For option deleted" });
      await fetchItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: error?.response?.data?.message || "Failed to delete option" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Ideal For</h1><p className="mt-0.5 text-sm text-muted-foreground">Manage ordered options shown when a project is listed.</p></div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> Add Option</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40 text-left text-muted-foreground"><th className="px-4 py-3">Actions</th><th className="px-4 py-3">#</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Image</th><th className="px-4 py-3">Display Order</th><th className="px-4 py-3">Active</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-14"><Spinner size="md" label="Loading..." /></td></tr> : items.length === 0 ? <tr><td colSpan={6} className="py-14 text-center text-muted-foreground">No Ideal For options found</td></tr> : items.map((item, index) => (
              <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><div className="flex items-center gap-1">
                  <button aria-label="Move up" disabled={index === 0} onClick={() => reorder(item, "up")} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button aria-label="Move down" disabled={index === items.length - 1} onClick={() => reorder(item, "down")} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button aria-label="Edit" onClick={() => openEdit(item)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={() => setDeleting(item)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div></td>
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3"><img src={item.image} alt={item.name} className="h-10 w-14 rounded object-cover" /></td>
                <td className="px-4 py-3 text-muted-foreground">{item.order}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Switch checked={item.isActive} onCheckedChange={() => toggleActive(item)} /><span className={item.isActive ? "text-xs text-green-600" : "text-xs text-muted-foreground"}>{item.isActive ? "Active" : "Inactive"}</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Ideal For Option" : "Add Ideal For Option"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label htmlFor="ideal-for-name">Name *</Label><Input id="ideal-for-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Families" /></div>
            <div className="space-y-1.5"><Label>Image *</Label>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : (editTarget?.image ?? "")); }} />
              <div className="flex items-center gap-3">{imagePreview ? <img src={imagePreview} alt="Option preview" className="h-16 w-20 rounded border object-cover" /> : <div className="flex h-16 w-20 items-center justify-center rounded border bg-muted text-muted-foreground"><ImagePlus className="h-5 w-5" /></div>}<Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>{imagePreview ? "Change Image" : "Upload Image"}</Button></div>
              <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · max 5 MB</p>
            </div>
            <div className="flex items-center justify-between"><Label>Is Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button><Button onClick={save} disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(value) => { if (!value) setDeleting(null); }}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Ideal For Option</DialogTitle></DialogHeader><p className="py-2 text-sm text-muted-foreground">Delete <strong className="text-foreground">{deleting?.name}</strong>? Projects already using it keep their saved snapshot.</p><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={remove}>Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
