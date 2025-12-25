import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  quiz_points: number;
  achievement_points: number;
  quizzes_completed: number;
  average_score: number;
  highest_score: number;
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
      // Fetch quiz attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from("user_quiz_attempts")
        .select(`user_id, score, quiz_id`);

      if (attemptsError) {
        console.error("Error fetching attempts:", attemptsError);
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(attempts?.map(a => a.user_id) || [])];
      
      if (userIds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, profile_pic")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch achievements for users
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select("user_id, achievements(points)")
        .in("user_id", userIds);

      // Calculate achievement points per user
      const achievementPointsMap = new Map<string, number>();
      userAchievements?.forEach((ua: any) => {
        const points = ua.achievements?.points || 0;
        achievementPointsMap.set(
          ua.user_id,
          (achievementPointsMap.get(ua.user_id) || 0) + points
        );
      });

      // Aggregate data by user
      const userStats = new Map<string, LeaderboardEntry>();
      
      attempts?.forEach((attempt) => {
        const userId = attempt.user_id;
        const existing = userStats.get(userId);
        const profile = profileMap.get(userId);
        
        // Calculate points based on performance
        let attemptPoints = 1;
        if (attempt.score >= 90) attemptPoints = 3;
        else if (attempt.score >= 70) attemptPoints = 2;
        
        if (existing) {
          existing.quiz_points += attemptPoints;
          existing.quizzes_completed += 1;
          existing.average_score = (existing.average_score * (existing.quizzes_completed - 1) + attempt.score) / existing.quizzes_completed;
          existing.highest_score = Math.max(existing.highest_score, attempt.score);
          existing.total_points = existing.quiz_points + existing.achievement_points;
        } else {
          const achievementPoints = achievementPointsMap.get(userId) || 0;
          userStats.set(userId, {
            user_id: userId,
            total_points: attemptPoints + achievementPoints,
            quiz_points: attemptPoints,
            achievement_points: achievementPoints,
            quizzes_completed: 1,
            average_score: attempt.score,
            highest_score: attempt.score,
            profile: {
              name: profile?.name || 'Unknown User',
              profile_pic: profile?.profile_pic || null,
            },
          });
        }
      });

      const sortedLeaderboard = Array.from(userStats.values())
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 50);

      setLeaderboard(sortedLeaderboard);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setLeaderboard([]);
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
        <div>
          <h1 className="text-4xl font-bold">Quiz Points Leaderboard</h1>
          <p className="text-muted-foreground">Top performers ranked by total points (quiz points + achievement points)</p>
        </div>
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
                      {entry.total_points} total points
                    </Badge>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{entry.quiz_points} quiz points • {entry.achievement_points} achievement points</div>
                      <div>{Math.round(entry.average_score)}% avg • {entry.highest_score}% highest</div>
                    </div>
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