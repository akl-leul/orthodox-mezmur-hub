import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Session } from "@supabase/supabase-js";

interface Discussion {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { name: string; profile_pic: string | null } | null;
  discussion_likes: { id: string; user_id: string }[];
  discussion_comments: { id: string }[];
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: { name: string; profile_pic: string | null } | null;
}

const Discussions = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();
        setIsAdmin(userRole?.role === "admin");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();
        setIsAdmin(userRole?.role === "admin");
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchDiscussions();

    const channel = supabase
      .channel("discussions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussions" },
        () => fetchDiscussions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_likes" },
        () => fetchDiscussions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_comments" },
        (payload) => {
          if (payload.new && (payload.new as any).discussion_id) {
            fetchComments((payload.new as any).discussion_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select(`
          id,
          content,
          created_at,
          user_id,
          discussion_likes(id, user_id),
          discussion_comments(id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const discussions = data || [];
      const userIds = [...new Set(discussions.map(d => d.user_id))];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_pic")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const discussionsWithProfiles = discussions.map(d => ({
        ...d,
        profiles: profileMap.get(d.user_id) || null
      }));

      setDiscussions(discussionsWithProfiles as Discussion[]);
    } catch (error: any) {
      toast.error("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (discussionId: string) => {
    try {
      const { data, error } = await supabase
        .from("discussion_comments")
        .select(`*`)
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const commentsData = data || [];
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_pic")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const commentsWithProfiles = commentsData.map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null
      }));

      setComments((prev) => ({ ...prev, [discussionId]: commentsWithProfiles as Comment[] }));
    } catch (error: any) {
      toast.error("Failed to load comments");
    }
  };

  const handleCreateDiscussion = async () => {
    if (!session) {
      toast.error("Please sign in to post");
      return;
    }

    if (!newDiscussion.trim()) {
      toast.error("Please write something");
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase.from("discussions").insert({
        user_id: session.user.id,
        content: newDiscussion.trim(),
      });

      if (error) throw error;
      toast.success("Discussion posted!");
      setNewDiscussion("");
    } catch (error: any) {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (discussionId: string, isLiked: boolean) => {
    if (!session) {
      toast.error("Please sign in to like");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from("discussion_likes")
          .delete()
          .eq("discussion_id", discussionId)
          .eq("user_id", session.user.id);
      } else {
        await supabase
          .from("discussion_likes")
          .insert({ discussion_id: discussionId, user_id: session.user.id });
      }
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  const handleDelete = async (discussionId: string) => {
    if (!confirm("Delete this discussion?")) return;

    try {
      const { error } = await supabase
        .from("discussions")
        .delete()
        .eq("id", discussionId);

      if (error) throw error;
      toast.success("Deleted");
    } catch (error: any) {
      toast.error("Failed to delete");
    }
  };

  const toggleComments = (discussionId: string) => {
    if (expandedDiscussion === discussionId) {
      setExpandedDiscussion(null);
    } else {
      setExpandedDiscussion(discussionId);
      if (!comments[discussionId]) {
        fetchComments(discussionId);
      }
    }
  };

  const handleAddComment = async (discussionId: string) => {
    if (!session) {
      toast.error("Please sign in to comment");
      return;
    }

    const content = newComment[discussionId]?.trim();
    if (!content) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const { error } = await supabase.from("discussion_comments").insert({
        discussion_id: discussionId,
        user_id: session.user.id,
        content,
        parent_comment_id: replyTo[discussionId] || null,
      });

      if (error) throw error;
      toast.success("Comment added!");
      setNewComment((prev) => ({ ...prev, [discussionId]: "" }));
      setReplyTo((prev) => ({ ...prev, [discussionId]: null }));
    } catch (error: any) {
      toast.error("Failed to add comment");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading discussions...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Thoughts & Discussions</h1>
      </div>

      {session && (
        <Card className="mb-6 shadow-elegant">
          <CardContent className="pt-6">
            <Textarea
              placeholder="Share your thoughts or reflections..."
              value={newDiscussion}
              onChange={(e) => setNewDiscussion(e.target.value)}
              rows={4}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handleCreateDiscussion} disabled={posting}>
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {discussions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No discussions yet. Be the first to share your thoughts!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => {
            const isLiked = discussion.discussion_likes.some(
              (like) => like.user_id === session?.user.id
            );
            const isOwner = discussion.user_id === session?.user.id;
            const isExpanded = expandedDiscussion === discussion.id;

            return (
              <Card key={discussion.id} className="shadow-elegant">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {discussion.profiles?.profile_pic ? (
                          <img
                            src={discussion.profiles.profile_pic}
                            alt={discussion.profiles.name}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {discussion.profiles?.name || "Anonymous"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(discussion.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isOwner || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(discussion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 whitespace-pre-wrap">{discussion.content}</p>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(discussion.id, isLiked)}
                      className="gap-2"
                    >
                      <Heart
                        className={`h-4 w-4 ${isLiked ? "fill-current text-destructive" : ""}`}
                      />
                      {discussion.discussion_likes.length}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(discussion.id)}
                      className="gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {discussion.discussion_comments.length}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {session && (
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Write a comment..."
                            value={newComment[discussion.id] || ""}
                            onChange={(e) =>
                              setNewComment((prev) => ({
                                ...prev,
                                [discussion.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => handleAddComment(discussion.id)}
                            size="sm"
                            className="self-end"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {comments[discussion.id]?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No comments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {comments[discussion.id]?.map((comment) => (
                            <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {comment.profiles?.name || "Anonymous"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Discussions;