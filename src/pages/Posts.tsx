import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, FileText, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Session } from "@supabase/supabase-js";

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string | null;
  image_url: string | null;
  author_id: string;
  created_at: string;
  profiles: { name: string; profile_pic: string | null } | null;
  likes: { id: string }[];
  comments: { id: string }[];
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { name: string; profile_pic: string | null } | null;
}

const Posts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    fetchPosts();

    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles(name, profile_pic),
          likes(id),
          comments(id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!session || !newPost.title || !newPost.content) return;

    try {
      const { error } = await supabase.from("posts").insert({
        title: newPost.title,
        content: newPost.content,
        author_id: session.user.id,
      });

      if (error) throw error;
      toast.success("Post created successfully!");
      setNewPost({ title: "", content: "" });
      setShowCreatePost(false);
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to create post");
    }
  };

  const handleReadPost = (post: Post) => {
    navigate(`/posts/${post.slug || post.id}`);
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading posts...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Blog & News</h1>
        </div>
        {session && (
          <Button onClick={() => setShowCreatePost(!showCreatePost)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        )}
      </div>

      {showCreatePost && session && (
        <Card className="mb-8 shadow-gold">
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Post title"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            />
            <Textarea
              placeholder="Share your thoughts..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={6}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreatePost}>Publish Post</Button>
              <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="shadow-gold hover:shadow-elegant transition-smooth cursor-pointer" onClick={() => handleReadPost(post)}>
              {post.image_url && (
                <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover rounded-t-lg" />
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{post.profiles?.name || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleReadPost(post); }}>
                    Read <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <CardTitle>{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-3">{post.content}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    {post.likes.length}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Posts;
