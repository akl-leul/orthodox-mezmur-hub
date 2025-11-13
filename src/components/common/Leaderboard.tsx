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

interface LeaderboardProps {
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  limit = 10, 
  showTitle = true, 
  compact = false 
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      console.log("Fetching leaderboard data...");
      
      // Use direct query with any type to bypass TypeScript restrictions
      const { data: leaderboardData, error } = await supabase
        .rpc('get_leaderboard_data') as any;

      console.log("Leaderboard query result:", { data: leaderboardData, error });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        
        // Fallback: Try to get quiz attempts and aggregate manually
        console.log("Trying fallback with quiz attempts...");
        const { data: attempts, error: attemptsError } = await supabase
          .from("user_quiz_attempts")
          .select(`
            user_id,
            score,
            quiz_id,
            profiles!inner(name, profile_pic)
          `);

        console.log("Attempts fallback result:", { data: attempts, error: attemptsError });

        if (attemptsError) {
          throw attemptsError;
        }

        // Aggregate data by user from attempts
        const userStats = new Map<string, LeaderboardEntry>();
        
        attempts?.forEach((attempt: any) => {
          const userId = attempt.user_id;
          const existing = userStats.get(userId);
          
          // Calculate points based on performance
          let attemptPoints = 1; // Base points for completing
          if (attempt.score >= 90) attemptPoints = 3; // Excellent
          else if (attempt.score >= 70) attemptPoints = 2; // Good
          
          if (existing) {
            existing.total_points += attemptPoints;
            existing.quiz_points += attemptPoints;
            existing.quizzes_completed += 1;
            existing.average_score = (existing.average_score * (existing.quizzes_completed - 1) + attempt.score) / existing.quizzes_completed;
            existing.highest_score = Math.max(existing.highest_score, attempt.score);
          } else {
            userStats.set(userId, {
              user_id: userId,
              total_points: attemptPoints,
              quiz_points: attemptPoints,
              achievement_points: 0,
              quizzes_completed: 1,
              average_score: attempt.score,
              highest_score: attempt.score,
              profile: {
                name: attempt.profiles.name,
                profile_pic: attempt.profiles.profile_pic,
              },
            });
          }
        });

        const sortedLeaderboard = Array.from(userStats.values())
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, limit);

        console.log("Processed attempts leaderboard data:", sortedLeaderboard);
        setLeaderboard(sortedLeaderboard);
      } else {
        // Transform the data from the function
        const transformedData: LeaderboardEntry[] = leaderboardData?.map((item: any) => ({
          user_id: item.user_id,
          total_points: item.total_points || 0,
          quiz_points: item.quiz_points || 0,
          achievement_points: item.achievement_points || 0,
          quizzes_completed: item.quizzes_completed || 0,
          average_score: item.average_score || 0,
          highest_score: item.highest_score || 0,
          profile: {
            name: item.user_name || 'Unknown User',
            profile_pic: item.user_profile_pic,
          },
        })) || [];

        console.log("Processed leaderboard data:", transformedData);
        setLeaderboard(transformedData);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      // Set empty array to prevent infinite loading
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="pt-6">
          <div className="text-center">Loading leaderboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Performers
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No quiz attempts yet. Be the first!
          </p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-smooth hover:bg-muted ${
                  index < 3 ? "bg-primary/5" : ""
                }`}
              >
                <div className="w-8 flex justify-center">{getRankIcon(index)}</div>
                
                {!compact && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.profile.profile_pic || undefined} />
                    <AvatarFallback className="text-xs">{entry.profile.name[0]}</AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${compact ? 'text-sm' : ''}`}>
                    {entry.profile.name}
                  </p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground">
                      {entry.quizzes_completed} quiz{entry.quizzes_completed !== 1 ? "es" : ""} completed
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <Badge variant="default" className={`${compact ? 'text-xs' : ''} mb-1`}>
                    {entry.total_points} pts
                  </Badge>
                  {!compact && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{entry.quiz_points} quiz • {entry.achievement_points} ach.</div>
                      <div>{Math.round(entry.average_score)}% avg • {entry.highest_score}% highest</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
