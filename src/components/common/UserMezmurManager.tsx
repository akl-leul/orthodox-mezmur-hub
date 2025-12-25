import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Music, 
  Play,
  Pause
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/GlobalAudioPlayerContext";

interface Mezmur {
  id: string;
  title: string;
  artist: string;
  lyrics: string | null;
  audio_url: string;
  created_at: string;
  updated_at: string;
  downloadable: boolean;
  category_id: string | null;
}

const UserMezmurManager: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [savedMezmurs, setSavedMezmurs] = useState<Mezmur[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { currentMezmur: globalCurrentMezmur, isPlaying, playMezmur, pauseMezmur } = useAudioPlayer();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchSavedMezmurs(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchSavedMezmurs = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_mezmurs")
        .select("*, mezmurs(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const mezmurs = data?.map(item => item.mezmurs).filter(Boolean) as Mezmur[] || [];
      setSavedMezmurs(mezmurs);
    } catch (error: any) {
      console.error("Error fetching saved mezmurs:", error);
      toast.error("Failed to load your saved mezmurs");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (mezmur: Mezmur) => {
    const playerMezmur = {
      id: mezmur.id,
      title: mezmur.title,
      artist: mezmur.artist,
      audio_url: mezmur.audio_url,
      lyrics: mezmur.lyrics,
      downloadable: mezmur.downloadable,
      category_id: mezmur.category_id,
    };
    
    if (globalCurrentMezmur?.id === mezmur.id && isPlaying) {
      pauseMezmur();
    } else {
      playMezmur(playerMezmur);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Please sign in to view your saved mezmurs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            My Saved Mezmurs
          </CardTitle>
          <CardDescription>
            Your saved mezmur collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading your mezmurs...</div>
          ) : savedMezmurs.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No saved mezmurs yet</h3>
              <p className="text-muted-foreground mb-4">
                Save mezmurs from the Mezmurs page to see them here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Lyrics</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedMezmurs.map((mezmur) => (
                  <TableRow key={mezmur.id}>
                    <TableCell className="font-medium">{mezmur.title}</TableCell>
                    <TableCell>{mezmur.artist}</TableCell>
                    <TableCell>
                      {mezmur.lyrics ? (
                        <span className="text-sm text-muted-foreground">Available</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlayPause(mezmur)}
                        >
                          {globalCurrentMezmur?.id === mezmur.id && isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserMezmurManager;