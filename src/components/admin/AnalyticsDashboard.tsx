import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Music, Brain, MessageSquare, TrendingUp } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalMezmurs: number;
  totalQuizzes: number;
  totalDiscussions: number;
  recentActivity: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalMezmurs: 0,
    totalQuizzes: 0,
    totalDiscussions: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [users, posts, mezmurs, quizzes, discussions, activity] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("mezmurs").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase.from("discussions").select("id", { count: "exact", head: true }),
        supabase
          .from("user_activity")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalUsers: users.count || 0,
        totalPosts: posts.count || 0,
        totalMezmurs: mezmurs.count || 0,
        totalQuizzes: quizzes.count || 0,
        totalDiscussions: discussions.count || 0,
        recentActivity: activity.count || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Posts", value: stats.totalPosts, icon: FileText, color: "text-green-500" },
    { title: "Total Mezmurs", value: stats.totalMezmurs, icon: Music, color: "text-purple-500" },
    { title: "Total Quizzes", value: stats.totalQuizzes, icon: Brain, color: "text-orange-500" },
    {
      title: "Discussions",
      value: stats.totalDiscussions,
      icon: MessageSquare,
      color: "text-pink-500",
    },
    {
      title: "Activity (7d)",
      value: stats.recentActivity,
      icon: TrendingUp,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Analytics Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-elegant hover-scale transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}