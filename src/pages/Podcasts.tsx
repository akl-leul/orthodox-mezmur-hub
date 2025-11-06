import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { SaveButton } from "@/components/SaveButton";
import { Podcast as PodcastIcon } from "lucide-react";

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

  // ✅ Convert any YouTube URL into embeddable format
  const normalizeYouTubeUrl = (url: string) => {
    try {
      if (url.includes("embed")) return url; // already in embed format
      const parsed = new URL(url);

      // youtube.com/watch?v=xxxx
      if (parsed.hostname.includes("youtube.com")) {
        const videoId = parsed.searchParams.get("v");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }

      // youtu.be/xxxx
      if (parsed.hostname === "youtu.be") {
        const videoId = parsed.pathname.replace("/", "");
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // otherwise return as-is
      return url;
    } catch {
      return url; // fallback if invalid URL
    }
  };

  const fetchPodcasts = async () => {
    try {
      const { data, error } = await supabase
        .from("podcasts")
        .select("*")
        .eq("published", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // ✅ Normalize embed URLs before storing
      const normalized = (data || []).map((p) => ({
        ...p,
        embed_url: normalizeYouTubeUrl(p.embed_url),
      }));

      setPodcasts(normalized);
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
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <PodcastIcon className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Podcasts</h1>
      </div>

      {podcasts.length === 0 ? (
        <p className="text-muted-foreground">No podcasts available yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {podcasts.map((podcast) => (
            <Card key={podcast.id} className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>{podcast.title}</CardTitle>
                  <SaveButton contentType="podcasts" itemId={podcast.id} showText />
                </div>
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
                    title={podcast.title}
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
