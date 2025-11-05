import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ContentType = 'mezmurs' | 'posts' | 'announcements' | 'podcasts';

export function useSavedContent(contentType: ContentType, itemId: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      checkIfSaved();
    }
  }, [userId, itemId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);
  };

  const getTableAndColumn = (type: ContentType) => {
    const mapping = {
      mezmurs: { table: 'saved_mezmurs', column: 'mezmur_id' },
      posts: { table: 'saved_posts', column: 'post_id' },
      announcements: { table: 'saved_announcements', column: 'announcement_id' },
      podcasts: { table: 'saved_podcasts', column: 'podcast_id' }
    };
    return mapping[type];
  };

  const checkIfSaved = async () => {
    if (!userId) return;

    try {
      const { table, column } = getTableAndColumn(contentType);
      const query = supabase.from(table as any).select('id').eq('user_id', userId);
      const result = await (query as any).eq(column, itemId).maybeSingle();

      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      setIsSaved(!!result.data);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const toggleSaved = async () => {
    if (!userId) {
      toast.error('Please login to save items');
      return;
    }

    setLoading(true);
    try {
      const { table, column } = getTableAndColumn(contentType);

      if (isSaved) {
        // Remove from saved
        const query = supabase.from(table as any).delete().eq('user_id', userId);
        const result = await (query as any).eq(column, itemId);

        if (result.error) throw result.error;
        setIsSaved(false);
        toast.success('Removed from saved');

        // Track activity
        await supabase.from('user_activity' as any).insert({
          user_id: userId,
          activity_type: `${contentType.slice(0, -1)}_unsaved`,
          target_id: itemId,
          target_type: contentType.slice(0, -1)
        });
      } else {
        // Add to saved
        const insertData: any = {
          user_id: userId,
          [column]: itemId
        };
        const result = await supabase.from(table as any).insert(insertData);

        if (result.error) throw result.error;
        setIsSaved(true);
        toast.success('Added to saved');

        // Track activity
        await supabase.from('user_activity' as any).insert({
          user_id: userId,
          activity_type: `${contentType.slice(0, -1)}_saved`,
          target_id: itemId,
          target_type: contentType.slice(0, -1)
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update saved status');
    } finally {
      setLoading(false);
    }
  };

  return { isSaved, loading, toggleSaved, isAuthenticated: !!userId };
}
