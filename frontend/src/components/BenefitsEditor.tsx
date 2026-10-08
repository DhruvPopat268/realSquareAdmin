import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BenefitsEditorProps {
  benefits: string[];
  onChange: (benefits: string[]) => void;
}

export default function BenefitsEditor({ benefits, onChange }: BenefitsEditorProps) {
  const [newBenefit, setNewBenefit] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function addBenefit() {
    const value = newBenefit.trim();
    if (!value) return;
    onChange([...benefits, value]);
    setNewBenefit("");
  }

  function updateBenefit(index: number, value: string) {
    onChange(benefits.map((benefit, currentIndex) => currentIndex === index ? value : benefit));
  }

  function removeBenefit(index: number) {
    onChange(benefits.filter((_, currentIndex) => currentIndex !== index));
  }

  function reorderBenefits(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const reordered = [...benefits];
    const [movedBenefit] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedBenefit);
    onChange(reordered);
    setDraggedIndex(null);
  }

  return (
    <section className="space-y-2" aria-label="Plan benefits">
      <div className="space-y-1">
        <Label htmlFor="new-plan-benefit">Benefits</Label>
        <p className="text-xs text-muted-foreground">Add the benefits customers will see. Drag rows to change their order.</p>
      </div>

      <div className="flex gap-2">
        <Input
          id="new-plan-benefit"
          value={newBenefit}
          placeholder="e.g. Priority customer support"
          onChange={(event) => setNewBenefit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addBenefit();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addBenefit} disabled={!newBenefit.trim()} aria-label="Add benefit">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add benefit</span>
        </Button>
      </div>

      {benefits.length > 0 ? (
        <ol className="space-y-2" aria-label="Benefits in display order">
          {benefits.map((benefit, index) => (
            <li
              key={`${index}-${benefit}`}
              draggable
              onDragStart={(event) => {
                setDraggedIndex(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                reorderBenefits(index);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className={`flex items-center gap-2 rounded-md border bg-background p-2 ${draggedIndex === index ? "opacity-50" : ""}`}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
              <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{index + 1}</span>
              <Input
                value={benefit}
                aria-label={`Benefit ${index + 1}`}
                placeholder="Enter a benefit"
                onChange={(event) => updateBenefit(index, event.target.value)}
                className="h-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBenefit(index)}
                aria-label={`Remove benefit ${index + 1}`}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          No benefits added yet.
        </p>
      )}
    </section>
  );
}
