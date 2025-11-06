import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  MessageCircle,
  Share2,
  ArrowLeft,
  Send,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Session } from "@supabase/supabase-js";
import { SaveButton } from "@/components/SaveButton";

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string | null;
  excerpt: string | null;
  read_time: number;
  featured_image: string | null;
  author_id: string;
  created_at: string;
  profiles: { name: string; profile_pic: string | null } | null;
  likes: { id: string }[];
  comments: { id: string }[];
}

interface Comment {
  id: string;
  content: string;
  approved: boolean;
  created_at: string;
  user_id: string;
  profiles: { name: string; profile_pic: string | null } | null;
}

const PostDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles(name, profile_pic),
          likes(id),
          comments(id)
        `,
        )
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Post not found");
        navigate("/posts");
        return;
      }
      setPost(data);
      fetchComments(data.id);
    } catch (error: any) {
      toast.error("Failed to load post");
      navigate("/posts");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, profiles(name, profile_pic)`)
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

  const handleLike = async () => {
    if (!session || !post) {
      toast.error("Please sign in to like posts");
      return;
    }

    const hasLiked = post.likes.some(() => true);

    try {
      if (hasLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: session.user.id });
      }
      fetchPost();
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  const handleAddComment = async () => {
    if (!session || !post) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: session.user.id,
        content: newComment.trim(),
        approved: true,
      });

      if (error) throw error;
      toast.success("Comment added!");
      setNewComment("");
      fetchComments(post.id);
      fetchPost();
    } catch (error: any) {
      toast.error("Failed to add comment");
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ approved: true })
        .eq("id", commentId);

      if (error) throw error;
      toast.success("Comment approved");
      if (post) fetchComments(post.id);
    } catch (error: any) {
      toast.error("Failed to approve comment");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt || post?.content.substring(0, 100),
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading post...</div>;
  }

  if (!post) {
    return null;
  }

  const isAuthor = session?.user.id === post.author_id;

  return (
    <div className="mx-auto py-8 md:px-40 ms:px-8 pb-24 md:pb-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/posts")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Posts
      </Button>

      <Card className="shadow-elegant">
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-64 md:h-96 object-cover rounded-t-lg"
          />
        )}
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {post.profiles?.profile_pic ? (
                  <img
                    src={post.profiles.profile_pic}
                    alt={post.profiles.name}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <MessageCircle className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold">
                  {post.profiles?.name || "Anonymous"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                  })}{" "}
                  · {post.read_time} min read
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
          {post.excerpt && (
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            {post.content.split("\n").map((paragraph, i) => (
              <p key={i} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-4 py-4 border-t border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className="gap-2"
            >
              <Heart
                className={`h-4 w-4 ${post.likes.length > 0 ? "fill-current text-destructive" : ""}`}
              />
              {post.likes.length}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {post.comments.length}
            </Button>
            <SaveButton contentType="posts" itemId={post.id} showText />
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-2xl font-bold">Comments</h3>

            {session && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddComment}
                  size="sm"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {loadingComments ? (
              <p className="text-sm text-muted-foreground">
                Loading comments...
              </p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {comment.profiles?.profile_pic ? (
                            <img
                              src={comment.profiles.profile_pic}
                              alt={comment.profiles.name}
                              className="h-full w-full object-cover rounded-full"
                            />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-primary" />
                          )}
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
                      {!comment.approved && isAuthor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveComment(comment.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      )}
                      {!comment.approved && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> Pending approval
                        </div>
                      )}
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostDetail;
