import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Discussion {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { name: string; email: string } | null;
}

const DiscussionApproval = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select(`id, content, created_at, user_id`)
        .order("created_at", { ascending: false });

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

  const handleDelete = async (discussionId: string) => {
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
      <h2 className="text-xl font-semibold">Manage Discussions</h2>

      {discussions.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No discussions yet</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Posted</TableHead>
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
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(discussion.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
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