import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Music, FileText, Bell } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    mezmurs: 0,
    posts: 0,
    announcements: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
      fetchStats();
    } catch (error) {
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, mezmursRes, postsRes, announcementsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("mezmurs").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("announcements").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        users: usersRes.count || 0,
        mezmurs: mezmursRes.count || 0,
        posts: postsRes.count || 0,
        announcements: announcementsRes.count || 0,
      });
    } catch (error) {
      toast.error("Failed to load statistics");
    }
  };

  if (loading || !isAdmin) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Content Management</CardTitle>
          <CardDescription>
            Manage all app content including mezmurs, posts, users, and announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mezmurs">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mezmurs">Mezmurs</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>
            <TabsContent value="mezmurs" className="py-4">
              <p className="text-muted-foreground">Mezmur management coming soon...</p>
            </TabsContent>
            <TabsContent value="posts" className="py-4">
              <p className="text-muted-foreground">Post management coming soon...</p>
            </TabsContent>
            <TabsContent value="users" className="py-4">
              <p className="text-muted-foreground">User management coming soon...</p>
            </TabsContent>
            <TabsContent value="announcements" className="py-4">
              <p className="text-muted-foreground">Announcement management coming soon...</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
