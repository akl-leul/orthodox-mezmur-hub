import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  Users,
  Music,
  FileText,
  Bell,
  FileStack,
  Podcast as PodcastIcon,
  Menu,
  LineChart as LineChartIcon, // Renaming to avoid conflict with Recharts LineChart
  BarChart as BarChartIcon, // Renaming to avoid conflict with Recharts BarChart
} from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import EnhancedMezmurManagement from "@/components/admin/EnhancedMezmurManagement";
import EnhancedPostManagement from "@/components/admin/EnhancedPostManagement";
import UserManagement from "@/components/admin/UserManagement";
import AnnouncementManagement from "@/components/admin/AnnouncementManagement";
import PageManagement from "@/components/admin/PageManagement";
import PodcastManagement from "@/components/admin/PodcastManagement";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  // SheetClose, // Not directly used here, but good to remember
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Recharts imports for graphs
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Chart configuration for shadcn/ui chart component, if used more extensively
// For now, we'll use Recharts directly for simplicity and flexibility with data.
const chartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--primary))",
  },
  mezmurs: {
    label: "Mezmurs",
    color: "hsl(var(--accent))",
  },
  posts: {
    label: "Posts",
    color: "hsl(var(--secondary))",
  },
  announcements: {
    label: "Announcements",
    color: "hsl(var(--destructive))",
  },
  pages: {
    label: "Pages",
    color: "hsl(var(--blue-500))", // Assuming a blue for pages
  },
  podcasts: {
    label: "Podcasts",
    color: "hsl(var(--purple-500))", // Assuming a purple for podcasts
  },
};

const COLORS = [
  "#0088FE", // Blue
  "#00C49F", // Green
  "#FFBB28", // Yellow
  "#FF8042", // Orange
  "#AF19FF", // Purple
  "#FF19A3", // Pink
  "#8884d8", // Indigo (default from Recharts examples)
  "#82ca9d", // Light Green (default from Recharts examples)
];

interface MezmurCategory {
  id: string;
  name: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    users: 0,
    mezmurs: 0,
    posts: 0,
    announcements: 0,
    pages: 0,
    podcasts: 0,
  });
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // New state for chart data
  const [userRegistrationData, setUserRegistrationData] = useState<any[]>([]);
  const [mezmurCategoryData, setMezmurCategoryData] = useState<any[]>([]);
  const [contentCreationData, setContentCreationData] = useState<any[]>([]);

  const fetchStatsAndChartsData = useCallback(async () => {
    try {
      // Fetch core stats
      const [
        usersRes,
        mezmursRes,
        postsRes,
        announcementsRes,
        pagesRes,
        podcastsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("mezmurs").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase
          .from("announcements")
          .select("id", { count: "exact", head: true }),
        supabase.from("pages").select("id", { count: "exact", head: true }),
        supabase.from("podcasts").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        users: usersRes.count || 0,
        mezmurs: mezmursRes.count || 0,
        posts: postsRes.count || 0,
        announcements: announcementsRes.count || 0,
        pages: pagesRes.count || 0,
        podcasts: podcastsRes.count || 0,
      });

      // Fetch data for User Registration Trend (last 6 months)
      const { data: userCreatedData, error: userCreatedError } = await supabase
        .from("profiles")
        .select("created_at")
        .gte(
          "created_at",
          new Date(
            new Date().setMonth(new Date().getMonth() - 6),
          ).toISOString(),
        );

      if (userCreatedError)
        console.error("Error fetching user created data:", userCreatedError);

      const monthlyUserRegistrations: { [key: string]: number } = {};
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Initialize monthly counts for the last 6 months
      for (let i = 0; i <= 6; i++) {
        const date = new Date(sixMonthsAgo);
        date.setMonth(date.getMonth() + i);
        const monthYear = date.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });
        monthlyUserRegistrations[monthYear] = 0;
      }

      userCreatedData?.forEach((user: { created_at: string }) => {
        const monthYear = new Date(user.created_at).toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });
        if (monthlyUserRegistrations[monthYear] !== undefined) {
          monthlyUserRegistrations[monthYear]++;
        }
      });

      const userChartData = Object.keys(monthlyUserRegistrations)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) // Ensure chronological order
        .map((month) => ({
          month,
          users: monthlyUserRegistrations[month],
        }));
      setUserRegistrationData(userChartData);

      // Fetch data for Mezmur Uploads by Category
      const { data: mezmurData, error: mezmurError } = await supabase
        .from("mezmurs")
        .select(`category_id`);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name");

      if (mezmurError)
        console.error(
          "Error fetching mezmur data for categories:",
          mezmurError,
        );
      if (categoriesError)
        console.error("Error fetching categories data:", categoriesError);

      const categoryMap = new Map<string, string>();
      categoriesData?.forEach((cat: MezmurCategory) =>
        categoryMap.set(cat.id, cat.name),
      );

      const categoryCounts: { [key: string]: number } = {};
      mezmurData?.forEach((mezmur: { category_id: string | null }) => {
        const categoryName = mezmur.category_id
          ? categoryMap.get(mezmur.category_id) || "Uncategorized"
          : "Uncategorized";
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });

      const mezmurCategoryChartData = Object.keys(categoryCounts).map(
        (name) => ({
          name,
          value: categoryCounts[name],
        }),
      );
      setMezmurCategoryData(mezmurCategoryChartData);

      // Fetch data for Content Creation Trend (Mezmurs and Posts, last 6 months)
      const { data: recentMezmurs, error: recentMezmurError } = await supabase
        .from("mezmurs")
        .select("created_at")
        .gte(
          "created_at",
          new Date(
            new Date().setMonth(new Date().getMonth() - 6),
          ).toISOString(),
        );

      if (recentMezmurError)
        console.error("Error fetching recent mezmurs:", recentMezmurError);

      const { data: recentPosts, error: recentPostError } = await supabase
        .from("posts")
        .select("created_at")
        .gte(
          "created_at",
          new Date(
            new Date().setMonth(new Date().getMonth() - 6),
          ).toISOString(),
        );

      if (recentPostError)
        console.error("Error fetching recent posts:", recentPostError);

      const monthlyContent: {
        [key: string]: { mezmurs: number; posts: number };
      } = {};

      // Initialize monthly counts for the last 6 months + current month
      for (let i = 0; i <= 6; i++) {
        const date = new Date(sixMonthsAgo);
        date.setMonth(date.getMonth() + i);
        const monthYear = date.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });
        monthlyContent[monthYear] = { mezmurs: 0, posts: 0 };
      }

      recentMezmurs?.forEach((item: { created_at: string }) => {
        const monthYear = new Date(item.created_at).toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });
        if (monthlyContent[monthYear]) {
          monthlyContent[monthYear].mezmurs += 1;
        }
      });

      recentPosts?.forEach((item: { created_at: string }) => {
        const monthYear = new Date(item.created_at).toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });
        if (monthlyContent[monthYear]) {
          monthlyContent[monthYear].posts += 1;
        }
      });

      const contentChartData = Object.keys(monthlyContent)
        .map((month) => ({
          month,
          mezmurs: monthlyContent[month].mezmurs,
          posts: monthlyContent[month].posts,
        }))
        .sort(
          (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
        ); // Sort by date
      setContentCreationData(contentChartData);
    } catch (error: any) {
      toast.error("Failed to load statistics or chart data");
      console.error("Error fetching admin data:", error.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAdminAccess = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchStatsAndChartsData(); // Call the combined fetch function
    } catch (error) {
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate, fetchStatsAndChartsData]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsSheetOpen(false); // Close the sheet when a tab is selected
  };

  if (loading || !isAdmin) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar - visible on md and larger screens */}
        <div className="hidden md:block">
          <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Mobile Header and Sidebar Trigger - visible on small screens */}
        <header className="md:hidden sticky top-0 z-40 w-full bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open Admin menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex flex-col w-[250px] sm:w-[300px]"
              >
                <SheetHeader>
                  <SheetTitle>Admin Navigation</SheetTitle>
                  <SheetDescription>Manage your hub content.</SheetDescription>
                </SheetHeader>
                <div className="py-4 flex-1 overflow-y-auto">
                  <AdminSidebar
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            {/* Placeholder for potential right-side mobile header elements */}
            <div></div>
          </div>
        </header>

        {/* Main content area */}
        {/* Added pt-16 for mobile to prevent content from being hidden under the fixed header */}
        <main className="flex-1 pb-24 md:pb-8 pt-16 md:pt-0">
          <div className="container mx-auto py-8 px-4">
            {/* Main Admin Panel title, hidden on small screens because it's in the mobile header */}
            <div className="hidden md:flex items-center gap-3 mb-8">
              <Settings className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Admin Panel</h1>
            </div>

            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Existing Stats Cards */}
                <Card className="shadow-gold">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>Total Users</CardDescription>
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.users}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-gold">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>Mezmurs</CardDescription>
                      <Music className="h-5 w-5 text-accent" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.mezmurs}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-gold">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>Posts</CardDescription>
                      <FileText className="h-5 w-5 text-secondary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.posts}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-gold">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>Announcements</CardDescription>
                      <Bell className="h-5 w-5 text-destructive" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.announcements}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-gold">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>Pages</CardDescription>
                      <FileStack className="h-5 w-5 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.pages}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-gold">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardDescription>Podcasts</CardDescription>
                      <PodcastIcon className="h-5 w-5 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.podcasts}</p>
                  </CardContent>
                </Card>

                {/* User Registrations Trend Chart */}
                <Card className="lg:col-span-2 shadow-elegant">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <LineChartIcon className="h-5 w-5 text-primary" />
                      <CardTitle>User Registrations Trend</CardTitle>
                    </div>
                    <CardDescription>
                      New user registrations over the last 6 months.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] p-0">
                    {userRegistrationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={userRegistrationData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            fontSize={10}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={10}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => (
                              <div className="rounded-lg border bg-background p-2 text-sm shadow-md">
                                {active && payload && payload.length ? (
                                  <div>
                                    <p className="font-bold">{label}</p>
                                    <p
                                      style={{
                                        color:
                                          payload[0].color ||
                                          chartConfig.users.color,
                                      }}
                                    >{`Users: ${payload[0].value}`}</p>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="users"
                            stroke={chartConfig.users.color}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No user registration data available for the last 6
                        months.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Mezmur Uploads by Category Chart */}
                <Card className="shadow-elegant">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-accent" />
                      <CardTitle>Mezmur Uploads by Category</CardTitle>
                    </div>
                    <CardDescription>
                      Distribution of mezmurs across categories.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] p-0 flex justify-center items-center">
                    {mezmurCategoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={mezmurCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {mezmurCategoryData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload, label }) => (
                              <div className="rounded-lg border bg-background p-2 text-sm shadow-md">
                                {active && payload && payload.length ? (
                                  <div>
                                    <p
                                      className="font-bold"
                                      style={{
                                        color: payload[0].color || COLORS[0],
                                      }} // Fallback color
                                    >
                                      {payload[0].name}
                                    </p>
                                    <p>{`Mezmurs: ${payload[0].value}`}</p>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          />
                          <Legend
                            formatter={(value, entry) =>
                              `${value} (${entry.payload.value})`
                            }
                            wrapperStyle={{ fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No mezmur category data available.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Content Creation Trend Chart */}
                <Card className="lg:col-span-3 shadow-elegant">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChartIcon className="h-5 w-5 text-secondary" />
                      <CardTitle>Content Creation Trend</CardTitle>
                    </div>
                    <CardDescription>
                      New mezmurs and posts over the last 6 months.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] p-0">
                    {contentCreationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={contentCreationData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            fontSize={10}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={10}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => (
                              <div className="rounded-lg border bg-background p-2 text-sm shadow-md">
                                {active && payload && payload.length ? (
                                  <div>
                                    <p className="font-bold">{label}</p>
                                    {payload.map((entry, index) => (
                                      <p
                                        key={`item-${index}`}
                                        style={{ color: entry.color }}
                                      >{`${entry.name}: ${entry.value}`}</p>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          />
                          <Legend />
                          <Bar
                            dataKey="mezmurs"
                            fill={chartConfig.mezmurs.color}
                            name="Mezmurs"
                            stackId="a"
                          />
                          <Bar
                            dataKey="posts"
                            fill={chartConfig.posts.color}
                            name="Posts"
                            stackId="a"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No content creation data available for the last 6
                        months.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "mezmurs" && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Mezmur Management</CardTitle>
                  <CardDescription>
                    Manage all mezmurs with file uploads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedMezmurManagement />
                </CardContent>
              </Card>
            )}

            {activeTab === "posts" && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Post Management</CardTitle>
                  <CardDescription>
                    Manage blog posts with images and markdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedPostManagement />
                </CardContent>
              </Card>
            )}

            {activeTab === "users" && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage users and assign roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagement />
                </CardContent>
              </Card>
            )}

            {activeTab === "announcements" && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Announcement Management</CardTitle>
                  <CardDescription>
                    Manage announcements for all users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnnouncementManagement />
                </CardContent>
              </Card>
            )}

            {activeTab === "pages" && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Page Management</CardTitle>
                  <CardDescription>
                    Create and manage dynamic pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PageManagement />
                </CardContent>
              </Card>
            )}

            {activeTab === "podcasts" && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Podcast Management</CardTitle>
                  <CardDescription>Manage podcast embeds</CardDescription>
                </CardHeader>
                <CardContent>
                  <PodcastManagement />
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
