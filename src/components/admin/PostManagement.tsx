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

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string; // Assuming posts have an author
  created_at: string;
}

const PostManagement: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<Post> | null>(null);
  const [filter, setFilter] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  useEffect(() => {
    fetchPosts();
    fetchUserId();
  }, []);

  const fetchUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch posts.");
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const handleCreateClick = () => {
    setCurrentPost({
      title: "",
      content: "",
      author_id: currentUserId || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (post: Post) => {
    setCurrentPost(post);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete post.");
      console.error("Error deleting post:", error);
    } else {
      toast.success("Post deleted successfully.");
      fetchPosts();
    }
  };

  const handleSavePost = async () => {
    if (!currentPost?.title || !currentPost?.content || !currentPost?.author_id) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (currentPost.id) {
      // Update existing post
      const { error } = await supabase
        .from("posts")
        .update({
          title: currentPost.title,
          content: currentPost.content,
        })
        .eq("id", currentPost.id);

      if (error) {
        toast.error("Failed to update post.");
        console.error("Error updating post:", error);
      } else {
        toast.success("Post updated successfully.");
        setIsDialogOpen(false);
        fetchPosts();
      }
    } else {
      // Create new post
      const { error } = await supabase.from("posts").insert([
        {
          title: currentPost.title,
          content: currentPost.content,
          author_id: currentUserId,
        },
      ]);

      if (error) {
        toast.error("Failed to create post.");
        console.error("Error creating post:", error);
      } else {
        toast.success("Post created successfully.");
        setIsDialogOpen(false);
        fetchPosts();
      }
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(filter.toLowerCase()) ||
    post.content.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div>Loading posts...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Filter posts..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Post
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Author ID</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPosts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="font-medium">{post.title}</TableCell>
              <TableCell className="max-w-[300px] truncate">{post.content}</TableCell>
              <TableCell>{post.author_id}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(post)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(post.id)}>
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
            <DialogTitle>{currentPost?.id ? "Edit Post" : "Add New Post"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={currentPost?.title || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">
                Content
              </Label>
              <Textarea
                id="content"
                value={currentPost?.content || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSavePost}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostManagement;
