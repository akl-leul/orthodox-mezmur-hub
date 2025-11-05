import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Home,
  Music,
  FileText,
  Bell,
  User,
  LogOut,
  Settings,
  Podcast,
} from "lucide-react";
import { Menu } from "lucide-react"; // Import Menu icon
import { cn } from "@/lib/utils";
import { Session } from "@supabase/supabase-js";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet"; // Import Sheet components

interface DynamicPage {
  id: string;
  title: string;
  slug: string;
  show_in_nav: boolean;
  show_in_footer: boolean;
  nav_order: number;
  footer_order: number;
}

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dynamicPages, setDynamicPages] = useState<DynamicPage[]>([]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      checkAdmin(session?.user?.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAdmin(session?.user?.id);
    });

    fetchDynamicPages();

    return () => subscription.unsubscribe();
  }, []);

  const fetchDynamicPages = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select(
          "id, title, slug, show_in_nav, show_in_footer, nav_order, footer_order",
        )
        .eq("published", true)
        .order("nav_order", { ascending: true });

      if (error) throw error;
      setDynamicPages(data || []);
    } catch (error) {
      console.error("Error fetching dynamic pages:", error);
    }
  };

  const checkAdmin = async (userId?: string) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/mezmurs", icon: Music, label: "Mezmurs" },
    { path: "/posts", icon: FileText, label: "Blog" },
    { path: "/podcasts", icon: Podcast, label: "Podcasts" },
    { path: "/announcements", icon: Bell, label: "News" },
    { path: "/dashboard", icon: User, label: "Dashboard" },
  ];

  // Add dynamic pages to navigation
  dynamicPages
    .filter((page) => page.show_in_nav)
    .forEach((page) => {
      navItems.push({
        path: `/page/${page.slug}`,
        icon: FileText,
        label: page.title,
      });
    });

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: Settings, label: "Admin" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl ml-4 md:ml-0"
          >
            {" "}
            {/* Adjusted margin for logo */}
            <Music className="h-6 w-6 text-primary" />
            <span className="gradient-primary bg-clip-text text-transparent">
              Orthodox Mezmur Hub
            </span>
          </Link>

          {/* Hamburger Menu for Mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Explore Orthodox Mezmur Hub</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.path}>
                      <Link
                        to={item.path}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <div className="mt-auto border-t pt-4">
                <ThemeToggle />
                {session ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start mt-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Sign Out
                  </Button>
                ) : (
                  <SheetClose asChild>
                    <Link to="/auth">
                      <Button className="w-full justify-start mt-2">
                        Sign In
                      </Button>
                    </Link>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <ThemeToggle />
            {session && (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </nav>

          {!session && (
            <Link to="/auth">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-card py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Orthodox Mezmur Hub</h3>
              <p className="text-sm text-muted-foreground">
                Your source for Orthodox Christian spiritual music and
                teachings.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {dynamicPages
                  .filter((page) => page.show_in_footer)
                  .sort((a, b) => a.footer_order - b.footer_order)
                  .map((page) => (
                    <li key={page.id}>
                      <Link
                        to={`/page/${page.slug}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-smooth"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Connect</h3>
              <p className="text-sm text-muted-foreground">
                Stay connected with our community.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Orthodox Mezmur Hub. All rights
            reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card shadow-elegant z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Global Audio Player */}
      <GlobalAudioPlayer />
    </div>
  );
};

export default Layout;
