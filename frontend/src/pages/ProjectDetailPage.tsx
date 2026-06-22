import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PROJECTS } from "@/data/projectsData";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, MapPin, Users, Calendar, Building2,
  TrendingUp, CheckCircle2, Share2, MoreVertical, Mail,
} from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

const statusStyle: Record<string, string> = {
  Active:    "bg-green-50 text-green-700 border border-green-200",
  Completed: "bg-blue-50 text-blue-700 border border-blue-200",
  "On Hold": "bg-amber-50 text-amber-600 border border-amber-200",
  Planning:  "bg-purple-50 text-purple-600 border border-purple-200",
};

const progressColor: Record<string, string> = {
  Active:    "bg-green-500",
  Completed: "bg-blue-500",
  "On Hold": "bg-amber-400",
  Planning:  "bg-purple-400",
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const p = PROJECTS.find((x) => x.id === Number(id));
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleComment = () => {
    if (!comment.trim()) return;
    setComments((c) => [...c, comment.trim()]);
    setComment("");
  };

  if (!p) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-muted-foreground text-lg">Project not found.</p>
      <Button variant="outline" onClick={() => navigate("/projects")}>Back to Projects</Button>
    </div>
  );

  const pctSold = Math.round((p.soldUnits / p.totalUnits) * 100);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate("/projects")} className="hover:text-foreground transition-colors">
          Projects
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Project Details</span>
      </nav>

      {/* Cover image */}
      <div className="rounded-xl overflow-hidden h-64 relative">
        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-5 flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle[p.status]}`}>{p.status}</span>
          <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-white/20 text-white backdrop-blur-sm">{p.type}</span>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{p.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{p.developer}</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 shrink-0" />{p.location}, {p.city}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Contact
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">

          {/* About */}
          <section>
            <h2 className="text-base font-bold text-foreground mb-2">About the Project</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
          </section>

          {/* Progress */}
          <section>
            <h2 className="text-base font-bold text-foreground mb-1">Sales & Construction Progress</h2>
            <p className="text-xs text-muted-foreground mb-4">Live progress tracking</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Units Sold</span>
                  <span className="font-semibold text-foreground">{p.soldUnits} / {p.totalUnits}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pctSold}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-right">{pctSold}% sold</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Construction</span>
                  <span className="font-semibold text-foreground">{p.progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressColor[p.status]}`} style={{ width: `${p.progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-right">Est. completion: {p.completionDate}</p>
              </div>
            </div>
          </section>

          {/* Details */}
          <section>
            <h2 className="text-base font-bold text-foreground">Project Details</h2>
            <p className="text-xs text-muted-foreground mb-4">Key project information</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Developer</p>
                <p className="font-semibold text-foreground mt-0.5">{p.developer}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Project Type</p>
                <p className="font-semibold text-foreground mt-0.5">{p.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-semibold text-foreground mt-0.5">{p.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price From</p>
                <p className="font-semibold text-foreground mt-0.5">{fmt(p.priceFrom)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price To</p>
                <p className="font-semibold text-foreground mt-0.5">{fmt(p.priceTo)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Units</p>
                <p className="font-semibold text-foreground mt-0.5">{p.totalUnits}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Launch Date</p>
                <p className="font-semibold text-foreground mt-0.5">{p.launchDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completion Date</p>
                <p className="font-semibold text-foreground mt-0.5">{p.completionDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Agent</p>
                <p className="font-semibold text-foreground mt-0.5">{p.agent}</p>
              </div>
            </div>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-base font-bold text-foreground">Amenities & Features</h2>
            <p className="text-xs text-muted-foreground mb-4">What this project offers</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
              {p.amenities.map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{a}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-4">

          {/* Quick stats */}
          <div className="border rounded-xl p-4 bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Quick Stats</h3>
            <div className="space-y-2.5">
              {[
                { icon: Building2,  label: "Total Units",    value: p.totalUnits },
                { icon: TrendingUp, label: "Units Sold",     value: p.soldUnits },
                { icon: Users,      label: "Units Available",value: p.totalUnits - p.soldUnits },
                { icon: Calendar,   label: "Days Since Launch",value: Math.floor((Date.now() - new Date(p.launchDate).getTime()) / 86_400_000) },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <s.icon className="h-3.5 w-3.5" />{s.label}
                  </div>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="border rounded-xl p-4 bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">It's good to talk</p>
            {comments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c, i) => (
                  <div key={i} className="bg-muted rounded-lg px-3 py-2 text-sm text-foreground">{c}</div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment(); }}
              placeholder="Say something"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            <p className="text-[10px] text-muted-foreground">Press Shift+Enter for new line. Enter to Submit</p>
            <Button className="w-full" size="sm" onClick={handleComment}>Submit</Button>
          </div>

        </div>
      </div>
    </div>
  );
}
