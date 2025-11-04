import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Podcast {
  id: string;
  title: string;
  description: string | null;
  embed_url: string;
  display_order: number;
}

export default function Podcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const { data, error } = await supabase
        .from("podcasts")
        .select("*")
        .eq("published", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPodcasts(data || []);
    } catch (error: any) {
      toast.error("Failed to load podcasts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div>Loading podcasts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Podcasts</h1>
      
      {podcasts.length === 0 ? (
        <p className="text-muted-foreground">No podcasts available yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {podcasts.map((podcast) => (
            <Card key={podcast.id}>
              <CardHeader>
                <CardTitle>{podcast.title}</CardTitle>
                {podcast.description && (
                  <CardDescription>{podcast.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="aspect-video w-full">
                  <iframe
                    src={podcast.embed_url}
                    className="w-full h-full rounded-lg"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
