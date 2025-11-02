import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const AnnouncementManagement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement> | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch announcements.");
      console.error("Error fetching announcements:", error);
    } else {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  };

  const handleCreateClick = () => {
    setCurrentAnnouncement({
      title: "",
      content: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete announcement.");
      console.error("Error deleting announcement:", error);
    } else {
      toast.success("Announcement deleted successfully.");
      fetchAnnouncements();
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!currentAnnouncement?.title || !currentAnnouncement?.content) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (currentAnnouncement.id) {
      // Update existing announcement
      const { error } = await supabase
        .from("announcements")
        .update({
          title: currentAnnouncement.title,
          content: currentAnnouncement.content,
        })
        .eq("id", currentAnnouncement.id);

      if (error) {
        toast.error("Failed to update announcement.");
        console.error("Error updating announcement:", error);
      } else {
        toast.success("Announcement updated successfully.");
        setIsDialogOpen(false);
        fetchAnnouncements();
      }
    } else {
      // Create new announcement
      const { error } = await supabase.from("announcements").insert([
        {
          title: currentAnnouncement.title,
          content: currentAnnouncement.content,
        },
      ]);

      if (error) {
        toast.error("Failed to create announcement.");
        console.error("Error creating announcement:", error);
      } else {
        toast.success("Announcement created successfully.");
        setIsDialogOpen(false);
        fetchAnnouncements();
      }
    }
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(filter.toLowerCase()) ||
    announcement.content.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div>Loading announcements...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Filter announcements..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Announcement
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAnnouncements.map((announcement) => (
            <TableRow key={announcement.id}>
              <TableCell className="font-medium">{announcement.title}</TableCell>
              <TableCell className="max-w-[300px] truncate">{announcement.content}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(announcement)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(announcement.id)}>
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
            <DialogTitle>{currentAnnouncement?.id ? "Edit Announcement" : "Add New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={currentAnnouncement?.title || ""}
                onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">
                Content
              </Label>
              <Textarea
                id="content"
                value={currentAnnouncement?.content || ""}
                onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, content: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveAnnouncement}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementManagement;
