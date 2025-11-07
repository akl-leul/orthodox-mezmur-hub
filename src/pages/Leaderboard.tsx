import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  quizzes_completed: number;
  average_score: number;
  profile: {
    name: string;
    profile_pic: string | null;
  };
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("user_quiz_attempts")
        .select(`
          user_id,
          score,
          profiles!inner(name, profile_pic)
        `)
        .order("score", { ascending: false });

      if (error) throw error;

      // Aggregate data by user
      const userStats = new Map<string, LeaderboardEntry>();
      
      data?.forEach((attempt: any) => {
        const userId = attempt.user_id;
        const existing = userStats.get(userId);
        
        if (existing) {
          existing.total_score += attempt.score;
          existing.quizzes_completed += 1;
          existing.average_score = existing.total_score / existing.quizzes_completed;
        } else {
          userStats.set(userId, {
            user_id: userId,
            total_score: attempt.score,
            quizzes_completed: 1,
            average_score: attempt.score,
            profile: {
              name: attempt.profiles.name,
              profile_pic: attempt.profiles.profile_pic,
            },
          });
        }
      });

      const sortedLeaderboard = Array.from(userStats.values())
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, 50);

      setLeaderboard(sortedLeaderboard);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Quiz Leaderboard</h1>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No quiz attempts yet. Be the first!
            </p>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-smooth hover:bg-muted ${
                    index < 3 ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="w-12 flex justify-center">{getRankIcon(index)}</div>
                  
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={entry.profile.profile_pic || undefined} />
                    <AvatarFallback>{entry.profile.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="font-semibold">{entry.profile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.quizzes_completed} quiz{entry.quizzes_completed !== 1 ? "es" : ""} completed
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge variant="default" className="mb-1">
                      {Math.round(entry.average_score)}% avg
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {entry.total_score} total points
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
