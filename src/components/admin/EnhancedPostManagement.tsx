import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Pencil, Trash2, Loader2, Image as ImageIcon } from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string | null;
  excerpt: string | null;
  read_time: number;
  featured_image: string | null;
  image_url: string | null;
  author_id: string;
  published: boolean;
  created_at: string;
}

const EnhancedPostManagement: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<Post> | null>(null);
  const [filter, setFilter] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

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
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to fetch posts.");
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const handleCreateClick = () => {
    setCurrentPost({
      title: "",
      content: "",
      slug: "",
      excerpt: "",
      read_time: 5,
      featured_image: "",
      published: true,
      author_id: currentUserId || "",
    });
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (post: Post) => {
    setCurrentPost(post);
    setImageFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      setImageFile(file);
    }
  };

  const uploadImageFile = async (): Promise<string | null> => {
    if (!imageFile) return currentPost?.featured_image || null;

    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("You must be logged in to upload files.");
        return null;
      }

      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
      console.error("Error uploading image:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSavePost = async () => {
    if (!currentPost?.title || !currentPost?.content || !currentPost?.author_id) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const imageUrl = await uploadImageFile();
    const slug = currentPost.slug || generateSlug(currentPost.title);
    const readTime = calculateReadTime(currentPost.content);

    const postData = {
      title: currentPost.title,
      content: currentPost.content,
      slug,
      excerpt: currentPost.excerpt || currentPost.content.substring(0, 160),
      read_time: readTime,
      featured_image: imageUrl,
      image_url: imageUrl,
      published: currentPost.published ?? true,
      author_id: currentPost.author_id,
    };

    if (currentPost.id) {
      const { error } = await supabase
        .from("posts")
        .update(postData)
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
      const { error } = await supabase.from("posts").insert([postData]);

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

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(filter.toLowerCase()) ||
      post.content.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div className="p-4">Loading posts...</div>;
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
            <TableHead>Slug</TableHead>
            <TableHead>Read Time</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPosts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="font-medium">{post.title}</TableCell>
              <TableCell className="max-w-[200px] truncate">{post.slug || "-"}</TableCell>
              <TableCell>{post.read_time} min</TableCell>
              <TableCell>{post.published ? "Yes" : "No"}</TableCell>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{currentPost?.id ? "Edit Post" : "Add New Post"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title *</Label>
              <Input
                id="title"
                value={currentPost?.title || ""}
                onChange={(e) => {
                  const title = e.target.value;
                  setCurrentPost({ 
                    ...currentPost, 
                    title,
                    slug: generateSlug(title)
                  });
                }}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="text-right">Slug</Label>
              <Input
                id="slug"
                value={currentPost?.slug || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="excerpt" className="text-right">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={currentPost?.excerpt || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                className="col-span-3"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">Content * (Markdown)</Label>
              <Textarea
                id="content"
                value={currentPost?.content || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
                className="col-span-3"
                rows={8}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">Featured Image</Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {imageFile && <p className="text-sm text-muted-foreground">Selected: {imageFile.name}</p>}
                {currentPost?.featured_image && !imageFile && (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <p className="text-sm text-muted-foreground">Image uploaded</p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="published" className="text-right">Publish Now</Label>
              <div className="col-span-3">
                <Switch
                  id="published"
                  checked={currentPost?.published ?? true}
                  onCheckedChange={(checked) => setCurrentPost({ ...currentPost, published: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline" disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleSavePost} disabled={uploading}>
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

export default EnhancedPostManagement;
