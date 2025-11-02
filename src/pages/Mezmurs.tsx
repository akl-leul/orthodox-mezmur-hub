import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayer } from "@/contexts/GlobalAudioPlayerContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Play, Download, Search, Pause } from "lucide-react";
import { toast } from "sonner";

interface Mezmur {
  id: string;
  title: string;
  artist: string;
  lyrics: string | null;
  audio_url: string;
  downloadable: boolean;
  category_id: string | null;
}

const Mezmurs = () => {
  const [mezmurs, setMezmurs] = useState<Mezmur[]>([]);
  const [filteredMezmurs, setFilteredMezmurs] = useState<Mezmur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMezmur, setSelectedMezmur] = useState<Mezmur | null>(null);
  const {
    currentMezmur: globalCurrentMezmur,
    isPlaying: globalIsPlaying,
    playMezmur,
    pauseMezmur,
  } = useAudioPlayer();

  useEffect(() => {
    fetchMezmurs();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = mezmurs.filter(
        (mezmur) =>
          mezmur.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          mezmur.artist.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredMezmurs(filtered);
    } else {
      setFilteredMezmurs(mezmurs);
    }
  }, [searchQuery, mezmurs]);

  const fetchMezmurs = async () => {
    try {
      const { data, error } = await supabase
        .from("mezmurs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMezmurs(data || []);
      setFilteredMezmurs(data || []);
    } catch (error: any) {
      toast.error("Failed to load Mezmurs");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = (mezmur: Mezmur) => {
    if (globalCurrentMezmur?.id === mezmur.id && globalIsPlaying) {
      pauseMezmur();
    } else {
      playMezmur(mezmur);
    }
  };

  const handleDownload = (e: React.MouseEvent, mezmur: Mezmur) => {
    e.stopPropagation(); // Prevent card onClick from firing
    if (mezmur.audio_url) {
      const link = document.createElement("a");
      link.href = mezmur.audio_url;
      const url = new URL(mezmur.audio_url);
      const pathSegments = url.pathname.split("/");
      const filenameWithExtension = pathSegments[pathSegments.length - 1];
      const parts = filenameWithExtension.split(".");
      const extension =
        parts.length > 1 && parts.pop() !== "" ? parts.pop() : "mp3";

      link.setAttribute(
        "download",
        `${mezmur.title} - ${mezmur.artist}.${extension}`,
      ); // Suggest a filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${mezmur.title}...`);
    } else {
      toast.error("No audio URL available for download.");
    }
  };

  // Removed local useEffect for audio cleanup, now handled by GlobalAudioPlayerContext

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading Mezmurs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <Music className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Ethiopian Mezmurs</h1>
      </div>

      <div className="mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredMezmurs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "No Mezmurs found matching your search"
                : "No Mezmurs available yet. Check back soon!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMezmurs.map((mezmur) => (
            <Card
              key={mezmur.id}
              className="shadow-gold hover:shadow-elegant transition-smooth cursor-pointer"
              onClick={() => setSelectedMezmur(mezmur)}
            >
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="line-clamp-1">{mezmur.title}</CardTitle>
                <CardDescription>{mezmur.artist}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card onClick from firing
                      handlePlayToggle(mezmur);
                    }}
                  >
                    {globalCurrentMezmur?.id === mezmur.id &&
                    globalIsPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {globalCurrentMezmur?.id === mezmur.id && globalIsPlaying
                      ? "Pause"
                      : "Play"}
                  </Button>
                  {mezmur.downloadable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleDownload(e, mezmur)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedMezmur && (
        <Card className="mt-8 shadow-elegant">
          <CardHeader>
            <CardTitle>Lyrics - {selectedMezmur.title}</CardTitle>
            <CardDescription>by {selectedMezmur.artist}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMezmur.lyrics ? (
              <div className="whitespace-pre-wrap">{selectedMezmur.lyrics}</div>
            ) : (
              <p className="text-muted-foreground">
                Lyrics not available for this Mezmur
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Mezmurs;
