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
  PlusCircle, 
  Pencil, 
  Trash2, 
  Upload,
  X,
  Play,
  Pause
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/GlobalAudioPlayerContext";
import { Session } from "@supabase/supabase-js";

interface Mezmur {
  id: string;
  title: string;
  artist: string;
  lyrics: string | null;
  audio_url: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const UserMezmurManager: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [mezmurs, setMezmurs] = useState<Mezmur[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMezmur, setCurrentMezmur] = useState<Partial<Mezmur> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    lyrics: "",
  });
  
  const { currentMezmur: globalCurrentMezmur, isPlaying, playMezmur, pauseMezmur } = useAudioPlayer();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchUserMezmurs(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchUserMezmurs = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mezmurs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMezmurs(data || []);
    } catch (error: any) {
      console.error("Error fetching user mezmurs:", error);
      toast.error("Failed to load your mezmurs");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) {
        toast.error("Please select an audio file");
        return;
      }
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Audio file must be smaller than 50MB");
        return;
      }
      setAudioFile(file);
    }
  };

  const uploadAudioFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user!.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('mezmur-audio')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('mezmur-audio')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title || !formData.artist) {
      toast.error("Title and artist are required");
      return;
    }

    if (!audioFile && !currentMezmur) {
      toast.error("Please select an audio file");
      return;
    }

    setUploading(true);
    try {
      let audioUrl = currentMezmur?.audio_url;

      // Upload new audio file if provided
      if (audioFile) {
        audioUrl = await uploadAudioFile(audioFile);
      }

      const mezmurData = {
        title: formData.title,
        artist: formData.artist,
        lyrics: formData.lyrics || null,
        audio_url: audioUrl!,
        user_id: user.id,
      };

      let error;
      if (currentMezmur?.id) {
        // Update existing mezmur
        ({ error } = await supabase
          .from("mezmurs")
          .update(mezmurData)
          .eq("id", currentMezmur.id));
      } else {
        // Create new mezmur
        ({ error } = await supabase
          .from("mezmurs")
          .insert(mezmurData));
      }

      if (error) throw error;

      toast.success(currentMezmur?.id ? "Mezmur updated successfully!" : "Mezmur uploaded successfully!");
      resetForm();
      fetchUserMezmurs(user.id);
    } catch (error: any) {
      console.error("Error saving mezmur:", error);
      toast.error("Failed to save mezmur");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (mezmur: Mezmur) => {
    setCurrentMezmur(mezmur);
    setFormData({
      title: mezmur.title,
      artist: mezmur.artist,
      lyrics: mezmur.lyrics || "",
    });
    setAudioFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mezmur?")) return;

    try {
      const { error } = await supabase
        .from("mezmurs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Mezmur deleted successfully!");
      fetchUserMezmurs();
    } catch (error: any) {
      console.error("Error deleting mezmur:", error);
      toast.error("Failed to delete mezmur");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", artist: "", lyrics: "" });
    setAudioFile(null);
    setCurrentMezmur(null);
    setIsDialogOpen(false);
  };

  const handlePlayPause = (mezmur: Mezmur) => {
    if (globalCurrentMezmur?.id === mezmur.id && isPlaying) {
      pauseMezmur();
    } else {
      playMezmur(mezmur);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Please sign in to manage your mezmurs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                My Mezmurs
              </CardTitle>
              <CardDescription>
                Upload and manage your own mezmur collection
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Mezmur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading your mezmurs...</div>
          ) : mezmurs.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mezmurs yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first mezmur to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Mezmur
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Lyrics</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mezmurs.map((mezmur) => (
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
                      {new Date(mezmur.created_at).toLocaleDateString()}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(mezmur)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(mezmur.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentMezmur?.id ? "Edit Mezmur" : "Upload New Mezmur"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter mezmur title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">Artist *</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  placeholder="Enter artist name"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="audio">Audio File *</Label>
              <Input
                id="audio"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                required={!currentMezmur?.id}
              />
              {audioFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Music className="h-4 w-4" />
                  {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {currentMezmur?.audio_url && !audioFile && (
                <p className="text-sm text-muted-foreground">
                  Current audio will be kept. Select a new file to replace it.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lyrics">Lyrics</Label>
              <Textarea
                id="lyrics"
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                placeholder="Enter mezmur lyrics (optional)"
                rows={6}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  "Uploading..."
                ) : currentMezmur?.id ? (
                  "Update Mezmur"
                ) : (
                  "Upload Mezmur"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserMezmurManager;
