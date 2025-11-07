import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

interface AchievementDisplayProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  loading: boolean;
}

export function AchievementDisplay({ achievements, userAchievements, loading }: AchievementDisplayProps) {
  const earnedIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const totalPoints = userAchievements.reduce((sum, ua) => sum + ua.achievements.points, 0);

  if (loading) {
    return <div className="text-center py-8">Loading achievements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Achievements</h2>
            <p className="text-muted-foreground">
              {userAchievements.length} of {achievements.length} unlocked
            </p>
          </div>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          {totalPoints} Points
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const isEarned = earnedIds.has(achievement.id);
          const userAchievement = userAchievements.find((ua) => ua.achievement_id === achievement.id);

          return (
            <Card
              key={achievement.id}
              className={`shadow-elegant transition-smooth ${
                isEarned ? "border-primary/50 bg-primary/5" : "opacity-60"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{achievement.icon}</div>
                  {isEarned ? (
                    <Badge variant="default">Earned</Badge>
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-lg">{achievement.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{achievement.points} pts</Badge>
                  {isEarned && userAchievement && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(userAchievement.earned_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
