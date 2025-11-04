import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Podcast {
  id: string;
  title: string;
  description: string | null;
  embed_url: string;
  published: boolean;
  display_order: number;
}

export default function PodcastManagement() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    embed_url: "",
    published: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const { data, error } = await supabase
        .from("podcasts")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPodcasts(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch podcasts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPodcast) {
        const { error } = await supabase
          .from("podcasts")
          .update(formData)
          .eq("id", editingPodcast.id);

        if (error) throw error;
        toast.success("Podcast updated successfully");
      } else {
        const { error } = await supabase.from("podcasts").insert([formData]);

        if (error) throw error;
        toast.success("Podcast created successfully");
      }

      fetchPodcasts();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save podcast");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this podcast?")) return;

    try {
      const { error } = await supabase.from("podcasts").delete().eq("id", id);

      if (error) throw error;
      toast.success("Podcast deleted successfully");
      fetchPodcasts();
    } catch (error: any) {
      toast.error("Failed to delete podcast");
      console.error(error);
    }
  };

  const handleEdit = (podcast: Podcast) => {
    setEditingPodcast(podcast);
    setFormData({
      title: podcast.title,
      description: podcast.description || "",
      embed_url: podcast.embed_url,
      published: podcast.published,
      display_order: podcast.display_order,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPodcast(null);
    setFormData({
      title: "",
      description: "",
      embed_url: "",
      published: true,
      display_order: 0,
    });
  };

  if (loading) {
    return <div>Loading podcasts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Podcast Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Podcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPodcast ? "Edit Podcast" : "Add New Podcast"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="embed_url">Embed URL</Label>
                <Input
                  id="embed_url"
                  value={formData.embed_url}
                  onChange={(e) =>
                    setFormData({ ...formData, embed_url: e.target.value })
                  }
                  placeholder="https://..."
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the iframe src URL from your podcast platform
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, published: checked })
                  }
                />
                <Label htmlFor="published">Published</Label>
              </div>

              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPodcast ? "Update" : "Add"} Podcast
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {podcasts.map((podcast) => (
          <div
            key={podcast.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <h3 className="font-semibold">{podcast.title}</h3>
              {podcast.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {podcast.description}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {podcast.published ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Published
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    Draft
                  </span>
                )}
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Order: {podcast.display_order}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(podcast)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(podcast.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
