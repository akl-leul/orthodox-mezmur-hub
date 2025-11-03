import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, Pencil, Trash2, Upload, Loader2 } from "lucide-react";

interface Mezmur {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  lyrics: string | null;
  created_at: string;
}

const EnhancedMezmurManagement: React.FC = () => {
  const [mezmurs, setMezmurs] = useState<Mezmur[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMezmur, setCurrentMezmur] = useState<Partial<Mezmur> | null>(null);
  const [filter, setFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMezmurs();
  }, []);

  const fetchMezmurs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mezmurs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch mezmurs.");
      console.error("Error fetching mezmurs:", error);
    } else {
      setMezmurs(data as Mezmur[]);
    }
    setLoading(false);
  };

  const handleCreateClick = () => {
    setCurrentMezmur({ title: "", artist: "", audio_url: "", lyrics: "" });
    setAudioFile(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (mezmur: Mezmur) => {
    setCurrentMezmur(mezmur);
    setAudioFile(null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this mezmur?")) return;

    const { error } = await supabase.from("mezmurs").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete mezmur.");
      console.error("Error deleting mezmur:", error);
    } else {
      toast.success("Mezmur deleted successfully.");
      fetchMezmurs();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("audio/")) {
        toast.error("Please select an audio file.");
        return;
      }
      setAudioFile(file);
    }
  };

  const uploadAudioFile = async (): Promise<string | null> => {
    if (!audioFile) return currentMezmur?.audio_url || null;

    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("You must be logged in to upload files.");
        return null;
      }

      const fileExt = audioFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("mezmur-audio")
        .upload(filePath, audioFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("mezmur-audio").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload audio file: " + error.message);
      console.error("Error uploading audio:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMezmur = async () => {
    if (!currentMezmur?.title || !currentMezmur?.artist) {
      toast.error("Please fill in title and artist.");
      return;
    }

    if (!audioFile && !currentMezmur?.audio_url) {
      toast.error("Please provide an audio file or URL.");
      return;
    }

    const audioUrl = await uploadAudioFile();
    if (!audioUrl && !currentMezmur?.audio_url) {
      toast.error("Failed to get audio URL.");
      return;
    }

    const mezmurData = {
      title: currentMezmur.title,
      artist: currentMezmur.artist,
      audio_url: audioUrl || currentMezmur.audio_url,
      lyrics: currentMezmur.lyrics,
    };

    if (currentMezmur.id) {
      const { error } = await supabase
        .from("mezmurs")
        .update(mezmurData)
        .eq("id", currentMezmur.id);

      if (error) {
        toast.error("Failed to update mezmur.");
        console.error("Error updating mezmur:", error);
      } else {
        toast.success("Mezmur updated successfully.");
        setIsDialogOpen(false);
        fetchMezmurs();
      }
    } else {
      const { error } = await supabase.from("mezmurs").insert([mezmurData]);

      if (error) {
        toast.error("Failed to create mezmur.");
        console.error("Error creating mezmur:", error);
      } else {
        toast.success("Mezmur created successfully.");
        setIsDialogOpen(false);
        fetchMezmurs();
      }
    }
  };

  const filteredMezmurs = mezmurs.filter(
    (mezmur) =>
      mezmur.title.toLowerCase().includes(filter.toLowerCase()) ||
      mezmur.artist.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div className="p-4">Loading mezmurs...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Filter mezmurs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Mezmur
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMezmurs.map((mezmur) => (
            <TableRow key={mezmur.id}>
              <TableCell className="font-medium">{mezmur.title}</TableCell>
              <TableCell>{mezmur.artist}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(mezmur)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(mezmur.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentMezmur?.id ? "Edit Mezmur" : "Add New Mezmur"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title *</Label>
              <Input
                id="title"
                value={currentMezmur?.title || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="artist" className="text-right">Artist *</Label>
              <Input
                id="artist"
                value={currentMezmur?.artist || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, artist: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="audio" className="text-right">Audio File</Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                />
                {audioFile && <p className="text-sm text-muted-foreground">Selected: {audioFile.name}</p>}
                {currentMezmur?.audio_url && !audioFile && (
                  <p className="text-sm text-muted-foreground">Current: {currentMezmur.audio_url.split("/").pop()}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="lyrics" className="text-right pt-2">Lyrics</Label>
              <Textarea
                id="lyrics"
                value={currentMezmur?.lyrics || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, lyrics: e.target.value })}
                className="col-span-3"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline" disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleSaveMezmur} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedMezmurManagement;
