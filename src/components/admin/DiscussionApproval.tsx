import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Discussion {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  profiles: { name: string; email: string } | null;
}

const DiscussionApproval = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");

  useEffect(() => {
    fetchDiscussions();

    // Real-time subscription
    const channel = supabase
      .channel("admin-discussions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussions",
        },
        () => {
          fetchDiscussions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchDiscussions = async () => {
    try {
      let query = supabase
        .from("discussions")
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          approved,
          approved_by,
          approved_at
        `
        )
        .order("created_at", { ascending: false });

      // Apply filter
      if (filter === "pending") {
        query = query.eq("approved", false);
      } else if (filter === "approved") {
        query = query.eq("approved", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profile data separately
      const discussions = data || [];
      const userIds = [...new Set(discussions.map((d) => d.user_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const discussionsWithProfiles = discussions.map((d) => ({
        ...d,
        profiles: profileMap.get(d.user_id) || null,
      }));

      setDiscussions(discussionsWithProfiles as Discussion[]);
    } catch (error: any) {
      toast.error("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (discussionId: string) => {
    try {
      const { error } = await supabase.rpc("approve_discussion", {
        discussion_id: discussionId,
      });

      if (error) throw error;
      toast.success("Discussion approved!");
      fetchDiscussions();
    } catch (error: any) {
      toast.error("Failed to approve discussion");
    }
  };

  const handleReject = async (discussionId: string) => {
    if (!confirm("Are you sure you want to delete this discussion?")) return;

    try {
      const { error } = await supabase
        .from("discussions")
        .delete()
        .eq("id", discussionId);

      if (error) throw error;
      toast.success("Discussion deleted!");
      fetchDiscussions();
    } catch (error: any) {
      toast.error("Failed to delete discussion");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading discussions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          onClick={() => setFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
      </div>

      {discussions.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {filter === "pending"
              ? "No pending discussions"
              : filter === "approved"
              ? "No approved discussions"
              : "No discussions"}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discussions.map((discussion) => (
              <TableRow key={discussion.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{discussion.profiles?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {discussion.profiles?.email || "No email"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="truncate">{discussion.content}</p>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(discussion.created_at), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  {discussion.approved ? (
                    <Badge variant="default">Approved</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {!discussion.approved && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(discussion.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(discussion.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default DiscussionApproval;
