import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

interface Mezmur {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  lyrics: string;
  created_at: string;
}

const MezmurManagement: React.FC = () => {
  const [mezmurs, setMezmurs] = useState<Mezmur[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMezmur, setCurrentMezmur] = useState<Partial<Mezmur> | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchMezmurs();
  }, []);

  const fetchMezmurs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("mezmurs").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch mezmurs.");
      console.error("Error fetching mezmurs:", error);
    } else {
      setMezmurs(data as Mezmur[]);
    }
    setLoading(false);
  };

  const handleCreateClick = () => {
    setCurrentMezmur({
      title: "",
      artist: "",
      audio_url: "",
      lyrics: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (mezmur: Mezmur) => {
    setCurrentMezmur(mezmur);
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

  const handleSaveMezmur = async () => {
    if (!currentMezmur?.title || !currentMezmur?.artist || !currentMezmur?.audio_url || !currentMezmur?.lyrics) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (currentMezmur.id) {
      // Update existing mezmur
      const { error } = await supabase
        .from("mezmurs")
        .update({
          title: currentMezmur.title,
          artist: currentMezmur.artist,
          audio_url: currentMezmur.audio_url,
          lyrics: currentMezmur.lyrics,
        })
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
      // Create new mezmur
      const { error } = await supabase.from("mezmurs").insert([
        {
          title: currentMezmur.title,
          artist: currentMezmur.artist,
          audio_url: currentMezmur.audio_url,
          lyrics: currentMezmur.lyrics,
        },
      ]);

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

  const filteredMezmurs = mezmurs.filter(mezmur =>
    mezmur.title.toLowerCase().includes(filter.toLowerCase()) ||
    mezmur.artist.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div>Loading mezmurs...</div>;
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
            <TableHead>Audio URL</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMezmurs.map((mezmur) => (
            <TableRow key={mezmur.id}>
              <TableCell className="font-medium">{mezmur.title}</TableCell>
              <TableCell>{mezmur.artist}</TableCell>
              <TableCell className="max-w-[200px] truncate">{mezmur.audio_url}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMezmur?.id ? "Edit Mezmur" : "Add New Mezmur"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={currentMezmur?.title || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="artist" className="text-right">
                Artist
              </Label>
              <Input
                id="artist"
                value={currentMezmur?.artist || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, artist: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="audio_url" className="text-right">
                Audio URL
              </Label>
              <Input
                id="audio_url"
                value={currentMezmur?.audio_url || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, audio_url: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lyrics" className="text-right">
                Lyrics
              </Label>
              <Input
                id="lyrics"
                value={currentMezmur?.lyrics || ""}
                onChange={(e) => setCurrentMezmur({ ...currentMezmur, lyrics: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveMezmur}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MezmurManagement;
