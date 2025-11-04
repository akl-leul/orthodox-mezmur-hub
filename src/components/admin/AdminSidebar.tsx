import { NavLink } from "react-router-dom";
import { Music, FileText, Users, Bell, LayoutDashboard, ChevronLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, value: "dashboard" },
  { title: "Mezmurs", icon: Music, value: "mezmurs" },
  { title: "Posts", icon: FileText, value: "posts" },
  { title: "Users", icon: Users, value: "users" },
  { title: "Announcements", icon: Bell, value: "announcements" },
  { title: "Pages", icon: FileText, value: "pages" },
  { title: "Podcasts", icon: Music, value: "podcasts" },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
      collapsible="icon"
    >
      <SidebarContent className="pt-4">
        <div className="px-4 mb-4 flex items-center justify-between">
          {!collapsed && <h2 className="text-lg font-bold">Admin Panel</h2>}
          <SidebarTrigger className={cn(collapsed && "mx-auto")}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </SidebarTrigger>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    className={cn(
                      "w-full justify-start",
                      activeTab === item.value && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-2">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
