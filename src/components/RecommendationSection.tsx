import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Music, Radio, Brain, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  id: string;
  title: string;
  type: "post" | "mezmur" | "podcast" | "quiz";
  description?: string;
  score: number;
}

interface RecommendationSectionProps {
  userId: string;
}

export function RecommendationSection({ userId }: RecommendationSectionProps) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      // Get user's activity
      const { data: activity } = await supabase
        .from("user_activity")
        .select("activity_type, target_type, target_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!activity) {
        setLoading(false);
        return;
      }

      // Analyze activity and get recommendations
      const recs: Recommendation[] = [];

      // Recommend posts if user reads posts
      const hasReadPosts = activity.some((a) => a.activity_type === "view_post");
      if (hasReadPosts) {
        const { data: posts } = await supabase
          .from("posts")
          .select("id, title, excerpt")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(3);

        posts?.forEach((post) => {
          recs.push({
            id: post.id,
            title: post.title,
            type: "post",
            description: post.excerpt || undefined,
            score: 0.8,
          });
        });
      }

      // Recommend quizzes if user completes quizzes
      const hasCompletedQuizzes = activity.some((a) => a.activity_type === "complete_quiz");
      if (hasCompletedQuizzes || recs.length < 3) {
        const { data: quizzes } = await supabase
          .from("quizzes")
          .select("id, title, description")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(2);

        quizzes?.forEach((quiz) => {
          recs.push({
            id: quiz.id,
            title: quiz.title,
            type: "quiz",
            description: quiz.description || undefined,
            score: 0.7,
          });
        });
      }

      // Recommend mezmurs
      const { data: mezmurs } = await supabase
        .from("mezmurs")
        .select("id, title, artist")
        .order("created_at", { ascending: false })
        .limit(2);

      mezmurs?.forEach((mezmur) => {
        recs.push({
          id: mezmur.id,
          title: mezmur.title,
          type: "mezmur",
          description: `By ${mezmur.artist}`,
          score: 0.6,
        });
      });

      // Recommend podcasts
      const { data: podcasts } = await supabase
        .from("podcasts")
        .select("id, title, description")
        .eq("published", true)
        .order("display_order", { ascending: true })
        .limit(2);

      podcasts?.forEach((podcast) => {
        recs.push({
          id: podcast.id,
          title: podcast.title,
          type: "podcast",
          description: podcast.description || undefined,
          score: 0.5,
        });
      });

      setRecommendations(recs.slice(0, 6));
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "post":
        return <BookOpen className="h-5 w-5" />;
      case "mezmur":
        return <Music className="h-5 w-5" />;
      case "podcast":
        return <Radio className="h-5 w-5" />;
      case "quiz":
        return <Brain className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  const handleClick = (rec: Recommendation) => {
    switch (rec.type) {
      case "post":
        navigate(`/posts/${rec.id}`);
        break;
      case "mezmur":
        navigate("/mezmurs");
        break;
      case "podcast":
        navigate("/podcasts");
        break;
      case "quiz":
        navigate(`/quiz/${rec.id}`);
        break;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading recommendations...</div>;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recommended For You</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <Card key={`${rec.type}-${rec.id}`} className="shadow-elegant hover-scale transition-smooth">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                {getIcon(rec.type)}
                <Badge variant="outline" className="capitalize">
                  {rec.type}
                </Badge>
              </div>
              <CardTitle className="text-lg">{rec.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {rec.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {rec.description}
                </p>
              )}
              <Button onClick={() => handleClick(rec)} variant="outline" className="w-full">
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
