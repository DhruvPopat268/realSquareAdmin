import {
  LayoutDashboard, Home, Building2, FolderOpen, MapPin, Users,
  BookUser, UserCheck, Tag, FileText, Calendar, Megaphone, File,
  BarChart2, TrendingUp, Settings, HelpCircle, ChevronDown,
  Wrench, Bell, ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";

const link  = "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full";
const active = "bg-sidebar-accent text-sidebar-accent-foreground font-semibold";
const label  = "px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none";

function SLink({ to, icon: Icon, children, collapsed }: { to: string; icon: any; children: string; collapsed: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={to} end className={link} activeClassName={active}>
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{children}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SGroup({ icon: Icon, label: lbl, urls, items, collapsed }: {
  icon: any; label: string; urls: string[];
  items: { title: string; url: string; icon: any }[];
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = urls.some((u) => location.pathname === u || location.pathname.startsWith(u + "/"));
  const [open, setOpen] = useState(isActive);

  if (collapsed) return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild>
            <NavLink to={item.url} end className={link} activeClassName={active}>
              <item.icon className="h-4 w-4 shrink-0" />
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(link, "cursor-pointer justify-between", isActive && "text-sidebar-accent-foreground font-semibold")}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {lbl}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="pl-4 mt-0.5 space-y-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end className={cn(link, "text-xs py-1.5")} activeClassName={active}>
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────
const sections = [
  {
    title: "Main",
    items: [
      { type: "link", to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    title: "Location Management",
    items: [
      { type: "link", to: "/states", icon: MapPin, label: "Manage States" },
      { type: "link", to: "/cities", icon: MapPin, label: "Manage Cities" },
    ],
  },
  {
    title: "Property Management",
    items: [
      { type: "link", to: "/property-purposes",   icon: Tag,    label: "Property Purposes" },
      { type: "link", to: "/property-categories", icon: Tag,    label: "Property Categories" },
      { type: "link", to: "/property-types",      icon: Wrench, label: "Property Types" },
      {
        type: "group", icon: Home, label: "Property Management",
        urls: ["/properties", "/properties/sale", "/properties/rent", "/properties/pg"],
        items: [
          { title: "All Properties",   url: "/properties",      icon: Home },
          { title: "For Sale",         url: "/properties/sale", icon: Tag },
          { title: "For Rent",         url: "/properties/rent", icon: Building2 },
          { title: "PG / Co-living",   url: "/properties/pg",   icon: MapPin },
        ],
      },
      { type: "link", to: "/projects", icon: FolderOpen, label: "Projects" },
    ],
  },
  {
    title: "Leads & Enquiries",
    items: [
      { type: "link", to: "/enquiries",  icon: Users, label: "Enquiries" },
      { type: "link", to: "/leads",      icon: Users, label: "Leads" },
    ],
  },
  // {
  //   title: "People",
  //   items: [
  //     { type: "link", to: "/contacts",   icon: BookUser,     label: "Contacts & Orgs" },
  //     { type: "link", to: "/brokers",    icon: UserCheck,    label: "Brokers & Agents" },
  //     { type: "link", to: "/owners",     icon: ShieldCheck,  label: "Property Owners" },
  //   ],
  // },
  // {
  //   title: "Marketing",
  //   items: [
  //     { type: "link", to: "/campaigns",  icon: Megaphone,    label: "Campaigns" },
  //     { type: "link", to: "/calendar",   icon: Calendar,     label: "Calendar" },
  //   ],
  // },
  // {
  //   title: "Reports",
  //   items: [
  //     { type: "link", to: "/reports/sales",      icon: BarChart2,   label: "Sales Reports" },
  //     { type: "link", to: "/reports/performance",icon: TrendingUp,  label: "Agent Performance" },
  //   ],
  // },
  // {
  //   title: "Documents",
  //   items: [
  //     { type: "link", to: "/documents",  icon: File,         label: "Documents" },
  //     { type: "link", to: "/contracts",  icon: FileText,     label: "Contracts" },
  //   ],
  // },
];

const bottomLinks = [
  // { to: "/notifications", icon: Bell,     label: "Notifications" },
  // { to: "/maintenance",   icon: Wrench,   label: "Maintenance" },
  // { to: "/settings",      icon: Settings, label: "Settings" },
  // { to: "/help",          icon: HelpCircle, label: "Help" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="offcanvas">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Home className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-sidebar-accent-foreground leading-tight">RealSquare</p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Real Estate Platform</p>
          </div>
        )}
      </div>

      <SidebarContent className="overflow-y-auto scrollbar-none" style={{ overflowY: "auto" }}>
        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && <p className={label}>{section.title}</p>}
            <SidebarMenu className="px-2 space-y-0.5">
              {section.items.map((item: any) =>
                item.type === "link" ? (
                  <SLink key={item.to} to={item.to} icon={item.icon} collapsed={collapsed}>
                    {item.label}
                  </SLink>
                ) : (
                  <SGroup
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    urls={item.urls}
                    items={item.items}
                    collapsed={collapsed}
                  />
                )
              )}
            </SidebarMenu>
          </div>
        ))}

        {/* Bottom */}
        <div className="mt-auto">
          {!collapsed && <p className={label}>System</p>}
          <SidebarMenu className="px-2 pb-4 space-y-0.5">
            {bottomLinks.map((l) => (
              <SLink key={l.to} to={l.to} icon={l.icon} collapsed={collapsed}>
                {l.label}
              </SLink>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
