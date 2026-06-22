import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import api from "@/lib/axiosInterceptor";

const fmtIST = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day:      "2-digit",
    month:    "2-digit",
    year:     "2-digit",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   true,
  });
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);

  const handleLogout = async () => {
    try { await api.post("/admin/auth/logout"); } catch {}
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search properties, leads..." className="pl-9 w-80 h-9 bg-muted/50" />
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="h-8 w-8 rounded-full bg-primary flex items-center justify-center overflow-hidden hover:opacity-90 transition"
            >
              {profile?.profilePhoto
                ? <img src={profile.profilePhoto} alt={profile.name} className="h-full w-full object-cover" />
                : <User className="h-4 w-4 text-primary-foreground" />}
            </button>
          </header>

          {/* Main */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Profile Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-14 right-4 z-50 bg-card w-80 rounded-xl shadow-2xl border p-6 space-y-5">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">My Profile</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                {profile?.profilePhoto
                  ? <img src={profile.profilePhoto} alt={profile.name} className="h-full w-full object-cover" />
                  : <User className="h-7 w-7 text-primary-foreground" />}
              </div>
              <div>
                <p className="font-semibold text-foreground">{profile?.name || "—"}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                  {profile?.role || "—"}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{profile?.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium text-foreground capitalize">{profile?.role || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Login</span>
                <span className="font-medium text-foreground">{fmtIST(profile?.lastLogin ?? null)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setModalOpen(false); navigate("/profile"); }}>
                Profile Settings
              </Button>
              <Button variant="destructive" className="flex-1 gap-1.5" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" /> Logout
              </Button>
            </div>
          </div>
        </>
      )}
    </SidebarProvider>
  );
};

export default AdminLayout;
