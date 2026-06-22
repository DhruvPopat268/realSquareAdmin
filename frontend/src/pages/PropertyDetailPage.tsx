import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PROPERTIES } from "@/data/propertiesData";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, Mail, Share2, MoreVertical, Bed, Bath,
  Maximize2, CheckCircle2,
} from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function fmtFull(n: number) {
  return "$" + n.toLocaleString();
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = PROPERTIES.find((p) => p.id === Number(id));
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground text-lg">Property not found.</p>
        <Button variant="outline" onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  const p = property;

  const handleComment = () => {
    if (!comment.trim()) return;
    setComments((c) => [...c, comment.trim()]);
    setComment("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleComment();
  };

  // gallery: first image big, rest 2x2 grid, last tile shows "+30" if more
  const imgs = p.images;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate("/properties")} className="hover:text-foreground transition-colors">
          Properties
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Property Details</span>
      </nav>

      {/* ── Image Gallery ── */}
      <div className="grid grid-cols-3 gap-2 h-72 rounded-xl overflow-hidden">
        {/* Main large image */}
        <div className="col-span-1 row-span-2 cursor-pointer" onClick={() => setLightbox(0)}>
          <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover hover:brightness-95 transition" />
        </div>
        {/* 2x2 thumbnails */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative cursor-pointer overflow-hidden" onClick={() => setLightbox(i)}>
            <img
              src={imgs[i] ?? imgs[0]}
              alt={`${p.title} ${i}`}
              className="w-full h-full object-cover hover:brightness-95 transition"
            />
            {i === 4 && imgs.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">30+</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={imgs[lightbox]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-6 text-white text-2xl font-bold hover:opacity-70"
          >✕</button>
        </div>
      )}

      {/* ── Title Row ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{p.title}</h1>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
              #{p.refNo}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{p.address}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Bed className="h-4 w-4" />{p.beds}</span>
            <span className="flex items-center gap-1.5"><Bath className="h-4 w-4" />{p.baths}</span>
            <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4" />{p.sqft.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Send Mail
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Main Content + Comment Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">

          {/* About */}
          <section>
            <h2 className="text-base font-bold text-foreground mb-2">About the Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
          </section>

          {/* Details */}
          <section>
            <h2 className="text-base font-bold text-foreground">Details</h2>
            <p className="text-xs text-muted-foreground mb-4">The property's essential info</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">For sale or for Rent</p>
                <p className="font-semibold text-foreground mt-0.5">{p.listingType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Property Type</p>
                <p className="font-semibold text-foreground mt-0.5">{p.propertyType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-semibold text-foreground mt-0.5">{p.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">List Selling Price</p>
                <p className="font-semibold text-foreground mt-0.5">{fmtFull(p.price)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Previous List Price</p>
                <p className="font-semibold text-foreground mt-0.5">{fmtFull(p.previousPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days on Market</p>
                <p className="font-semibold text-foreground mt-0.5">{p.daysOnMarket}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bedrooms</p>
                <p className="font-semibold text-foreground mt-0.5">{p.beds}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bathrooms</p>
                <p className="font-semibold text-foreground mt-0.5">{p.baths}</p>
              </div>
            </div>
          </section>

          {/* Property Information */}
          <section>
            <h2 className="text-base font-bold text-foreground">Property Information</h2>
            <p className="text-xs text-muted-foreground mb-4">Details & facts about the property</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Reference #</p>
                <p className="font-semibold text-foreground mt-0.5">{p.refNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Construction Year</p>
                <p className="font-semibold text-foreground mt-0.5">{p.constructionYear}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Construction Materials</p>
                <p className="font-semibold text-foreground mt-0.5">{p.constructionMaterial}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Home Size (Sqft)</p>
                <p className="font-semibold text-foreground mt-0.5">{p.sqft.toLocaleString()} sqft</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lot Size</p>
                <p className="font-semibold text-foreground mt-0.5">{p.lotSize}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price per Sqft</p>
                <p className="font-semibold text-foreground mt-0.5">${p.pricePerSqft.toLocaleString()}</p>
              </div>
            </div>
          </section>

          {/* Internal Details */}
          <section>
            <h2 className="text-base font-bold text-foreground">Internal Details</h2>
            <p className="text-xs text-muted-foreground mb-4">Internal features</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2">
              {/* Flooring column */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Flooring</p>
                <div className="space-y-1.5">
                  {p.flooring.map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-sm text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
              {/* Features split across 2 columns */}
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-2">Flooring</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-sm text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ── Comments Panel ── */}
        <div className="xl:col-span-1">
          <div className="sticky top-4 border rounded-xl p-4 bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">It's good to talk</p>

            {/* Existing comments */}
            {comments.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((c, i) => (
                  <div key={i} className="bg-muted rounded-lg px-3 py-2 text-sm text-foreground">{c}</div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something"
              rows={4}
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
