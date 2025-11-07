import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  points: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

export const useAchievements = (userId: string | undefined) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAchievements();
      fetchUserAchievements();
      subscribeToAchievements();
    }
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("points", { ascending: true });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setUserAchievements(data || []);
    } catch (error) {
      console.error("Failed to fetch user achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAchievements = () => {
    const channel = supabase
      .channel("user-achievements")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const newAchievement = payload.new;
          
          // Fetch the achievement details
          const { data } = await supabase
            .from("achievements")
            .select("*")
            .eq("id", newAchievement.achievement_id)
            .single();

          if (data) {
            toast.success(`Achievement Unlocked: ${data.title}!`, {
              description: data.description,
              icon: data.icon,
            });
            
            fetchUserAchievements();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkAndAwardAchievement = async (criteriaType: string, currentValue: number) => {
    if (!userId) return;

    try {
      // Find eligible achievements
      const eligibleAchievements = achievements.filter(
        (ach) => ach.criteria_type === criteriaType && currentValue >= ach.criteria_value
      );

      for (const achievement of eligibleAchievements) {
        // Check if user already has this achievement
        const hasAchievement = userAchievements.some(
          (ua) => ua.achievement_id === achievement.id
        );

        if (!hasAchievement) {
          // Award the achievement
          const { error } = await supabase
            .from("user_achievements")
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
            });

          if (error) throw error;

          // Send email notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", userId)
            .single();

          if (profile) {
            await supabase.functions.invoke("send-achievement-notification", {
              body: {
                email: profile.email,
                name: profile.name,
                achievementTitle: achievement.title,
                achievementDescription: achievement.description,
                achievementIcon: achievement.icon,
                points: achievement.points,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to check achievements:", error);
    }
  };

  return {
    achievements,
    userAchievements,
    loading,
    checkAndAwardAchievement,
  };
};
