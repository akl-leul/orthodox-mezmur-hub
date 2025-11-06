import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { SaveButton } from "@/components/SaveButton";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading announcements...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <Bell className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Announcements & News</h1>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No announcements at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Bell className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <CardTitle>{announcement.title}</CardTitle>
                      <CardDescription>
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                  <SaveButton contentType="announcements" itemId={announcement.id} showText />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{announcement.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
