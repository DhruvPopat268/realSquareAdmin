import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";
import { UserCircle, User, Lock, X, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axiosInterceptor";
import { useProfile } from "@/context/ProfileContext";
import { cn } from "@/lib/utils";

const formatIST = (iso: string) => {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

interface SystemUserRole {
  _id: string;
  name: string;
  permissions: string[];
  isActive: boolean;
}

interface ActivePlan {
  name: string;
  numberOfPropertiesGiven: number;
  propertiesUsed: number;
  expiryDate: string | null;
}

interface SystemUser {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: SystemUserRole | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  profilePhoto?: string;
  autoApprovalProperties?: boolean;
  freeListedProperties?: number;
  lastLogin: string | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  // User-specific profiles
  ownerProfile?: {
    businessDetails?: {
      name?: string;
      type?: string;
      gstNumber?: string;
      email?: string;
      mobile?: string;
      website?: string;
      logo?: string;
    };
  };
  brokerProfile?: {
    yearsOfExperience?: number;
    agencyName?: string;
    bio?: string;
  };
  builderProfile?: {
    gstNumber?: string;
    cinNumber?: string;
    foundedYear?: number;
    totalProjectsDelivered?: number;
    location?: {
      name?: string;
      latitude?: number;
      longitude?: number;
    };
  };
  customerProfile?: {
    location?: {
      name?: string;
      latitude?: number;
      longitude?: number;
    };
    bio?: string;
    verified?: boolean;
  };
  // Additional fields from /me endpoint
  coinsBalance?: number;
  activePlan?: ActivePlan | null;
  myPropertyListingAllowed?: boolean;
}

type Section = "profile" | "security";

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "profile",  label: "Update Profile",    icon: <User className="h-4 w-4" /> },
  { key: "security", label: "Security Settings", icon: <Lock className="h-4 w-4" /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const [user, setUser]       = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState<Section>("profile");

  // per-section submitting
  const { refreshProfile } = useProfile();
  const [subProfile,  setSubProfile]  = useState(false);
  const [subSecurity, setSubSecurity] = useState(false);

  // profile form
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const photoRef          = useRef<HTMLInputElement>(null);

  // security form
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCur, setShowCur]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showCon, setShowCon]       = useState(false);

  // section refs for scroll
  const sectionRefs: Record<Section, React.RefObject<HTMLDivElement>> = {
    profile:  useRef<HTMLDivElement>(null),
    security: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    api.get("/admin/auth/me")
      .then(res => {
        const u: SystemUser = res.data.data;
        setUser(u); setName(u.name); setEmail(u.email); setMobile(u.mobile);
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  // IntersectionObserver — highlight nav as sections scroll into view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.keys(sectionRefs) as Section[]).forEach((key) => {
      const el = sectionRefs[key].current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(key); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [loading]);

  const scrollTo = (key: Section) => {
    setActive(key);
    sectionRefs[key].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveProfile = async () => {
    setSubProfile(true);
    try {
      let payload: any;
      if (photo) {
        const fd = new FormData();
        fd.append("name", name); fd.append("email", email); fd.append("mobile", mobile);
        fd.append("profilePhoto", photo);
        payload = fd;
      } else {
        payload = { name, email, mobile };
      }
      const res = await api.patch("/admin/auth/me", payload);
      setUser(res.data.data); setPhoto(null); refreshProfile();
      if (photoRef.current) photoRef.current.value = "";
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally { setSubProfile(false); }
  };

  const handleSaveSecurity = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) return toast.error("All password fields are required");
    if (newPwd.length < 6)                      return toast.error("New password must be at least 6 characters");
    if (newPwd !== confirmPwd)                   return toast.error("Passwords do not match");
    setSubSecurity(true);
    try {
      await api.patch("/admin/auth/me/change-password", { currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      toast.success("Password changed successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally { setSubSecurity(false); }
  };

  if (loading) return <Spinner />;
  if (!user)   return <p className="text-muted-foreground text-sm">Profile not found.</p>;

  const avatarSrc = photo ? URL.createObjectURL(photo) : user.profilePhoto;

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)] overflow-hidden">

      {/* ── Left nav (sticky) ── */}
      <div className="w-72 shrink-0 space-y-3 h-full overflow-y-auto">

        {/* Avatar + identity */}
        <Card className="border-0 shadow-sm">
          <CardContent className="py-5 flex flex-col items-center gap-2 text-center">
            <div className="relative">
              {avatarSrc
                ? <img src={avatarSrc} alt={user.name} className="h-16 w-16 rounded-full object-cover border-2 border-border" />
                : <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border-2 border-border"><UserCircle className="h-8 w-8 text-muted-foreground" /></div>
              }
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              <button
                onClick={() => photoRef.current?.click()}
                className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background hover:bg-primary/90 transition-colors"
                title="Change photo"
              >
                <User className="h-2.5 w-2.5" />
              </button>
            </div>
            {photo && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate max-w-[110px]">{photo.name}</span>
                <button onClick={() => { setPhoto(null); if (photoRef.current) photoRef.current.value = ""; }}>
                  <X className="h-3 w-3 hover:text-destructive" />
                </button>
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role?.name || "No Role"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <StatusBadge status={user.isActive ? "Active" : "Inactive"} />
              {user.isSuperAdmin && <StatusBadge status="Super Admin" />}
            </div>
            <Separator className="my-1" />
            <div className="w-full space-y-1 text-left">
              {user.coinsBalance !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Coins Balance</span>
                  <span className="font-medium">{user.coinsBalance.toLocaleString()}</span>
                </div>
              )}
              {user.freeListedProperties !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Free Listings</span>
                  <span className="font-medium">{user.freeListedProperties}</span>
                </div>
              )}
              {user.autoApprovalProperties !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Auto Approval</span>
                  <span className="font-medium">{user.autoApprovalProperties ? "Yes" : "No"}</span>
                </div>
              )}
              {user.activePlan && (
                <>
                  <Separator className="my-1" />
                  <div className="text-xs">
                    <p className="text-muted-foreground mb-1">Active Plan</p>
                    <p className="font-medium">{user.activePlan.name}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Properties Used</span>
                      <span className="font-medium">
                        {user.activePlan.propertiesUsed} / {user.activePlan.numberOfPropertiesGiven === -1 ? "∞" : user.activePlan.numberOfPropertiesGiven}
                      </span>
                    </div>
                    {user.activePlan.expiryDate && (
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Expires</span>
                        <span className="font-medium">{formatIST(user.activePlan.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Last Login</span>
                <span className="font-medium">{user.lastLogin ? formatIST(user.lastLogin) : "Never"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Last Activity</span>
                <span className="font-medium">{user.lastActivity ? formatIST(user.lastActivity) : "Never"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nav */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-2 space-y-0.5">
            {NAV.map(n => (
              <button
                key={n.key}
                onClick={() => scrollTo(n.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                  active === n.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {n.icon}{n.label}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Right: all sections always visible ── */}
      <div className="flex-1 min-w-0 space-y-4 h-full overflow-y-auto pr-1">

        {/* Update Profile */}
        <div ref={sectionRefs.profile}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </div>
            </CardContent>
            <div className="px-6 pb-5 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={subProfile} className="px-8">
                {subProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Security Settings */}
        <div ref={sectionRefs.security}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Lock className="h-4 w-4" /> Change Password
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              {([
                { label: "Current Password", value: currentPwd, set: setCurrentPwd, show: showCur, toggle: () => setShowCur(p => !p) },
                { label: "New Password",     value: newPwd,     set: setNewPwd,     show: showNew, toggle: () => setShowNew(p => !p) },
                { label: "Confirm Password", value: confirmPwd, set: setConfirmPwd, show: showCon, toggle: () => setShowCon(p => !p) },
              ] as const).map(({ label, value, set, show, toggle }) => (
                <div key={label} className="space-y-1.5">
                  <Label>{label}</Label>
                  <div className="relative">
                    <Input type={show ? "text" : "password"} value={value} onChange={(e) => set(e.target.value)} placeholder="••••••••" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={toggle}>
                      {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="px-6 pb-5 flex justify-end">
              <Button onClick={handleSaveSecurity} disabled={subSecurity} className="px-8">
                {subSecurity ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
