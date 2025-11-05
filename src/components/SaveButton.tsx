import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useSavedContent } from "@/hooks/useSavedContent";

interface SaveButtonProps {
  contentType: 'mezmurs' | 'posts' | 'announcements' | 'podcasts';
  itemId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function SaveButton({ 
  contentType, 
  itemId, 
  variant = "ghost", 
  size = "sm",
  showText = false 
}: SaveButtonProps) {
  const { isSaved, loading, toggleSaved, isAuthenticated } = useSavedContent(contentType, itemId);

  if (!isAuthenticated) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        toggleSaved();
      }}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSaved ? (
        <>
          <BookmarkCheck className="h-4 w-4" />
          {showText && <span className="ml-2">Saved</span>}
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          {showText && <span className="ml-2">Save</span>}
        </>
      )}
    </Button>
  );
}
