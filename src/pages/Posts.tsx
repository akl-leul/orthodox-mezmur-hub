import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, FileText, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Session } from "@supabase/supabase-js";

interface Post {
  id: string;
  title: string;
  content: string;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

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

  const handleLike = async (postId: string) => {
    if (!session) {
      toast.error("Please sign in to like posts");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    const hasLiked = post?.likes.some((like) => like.id);

    try {
      if (hasLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", session.user.id);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: session.user.id });
      }
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles(name, profile_pic)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentToggle = (postId: string) => {
    if (selectedPost === postId) {
      setSelectedPost(null);
      setComments([]);
    } else {
      setSelectedPost(postId);
      fetchComments(postId);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!session) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: session.user.id,
        content: newComment.trim(),
      });

      if (error) throw error;
      toast.success("Comment added!");
      setNewComment("");
      fetchComments(postId);
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to add comment");
    }
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
            <Card key={post.id} className="shadow-gold hover:shadow-elegant transition-smooth">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{post.profiles?.name || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <CardTitle>{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{post.content}</p>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="gap-2"
                  >
                    <Heart
                      className={`h-4 w-4 ${post.likes.length > 0 ? "fill-current text-destructive" : ""}`}
                    />
                    {post.likes.length}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCommentToggle(post.id)}
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.comments.length}
                  </Button>
                </div>

                {selectedPost === post.id && (
                  <div className="mt-4 space-y-4 pt-4 border-t">
                    <h4 className="font-semibold">Comments</h4>
                    
                    {session && (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleAddComment(post.id)}
                          size="sm"
                          className="self-end"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {loadingComments ? (
                      <p className="text-sm text-muted-foreground">Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <MessageCircle className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {comment.profiles?.name || "Anonymous"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Posts;
