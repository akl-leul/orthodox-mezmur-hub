import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  User, 
  Settings, 
  BookmarkIcon, 
  Music, 
  FileText, 
  Bell, 
  Podcast as PodcastIcon,
  Activity,
  Upload,
  Loader2
} from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";
import { AchievementDisplay } from "@/components/AchievementDisplay";
import { RecommendationSection } from "@/components/RecommendationSection";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({ name: "", email: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  
  // Use achievements hook
  const { achievements, userAchievements, loading: achievementsLoading } = useAchievements(user?.id);

  // Saved content
  const [savedMezmurs, setSavedMezmurs] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedAnnouncements, setSavedAnnouncements] = useState<any[]>([]);
  const [savedPodcasts, setSavedPodcasts] = useState<any[]>([]);

  // Activity and stats
  const [activityData, setActivityData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    postsCreated: 0,
    commentsAdded: 0,
    likesGiven: 0,
    savedItems: 0
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchProfile(session.user.id);
    fetchSavedContent(session.user.id);
    fetchActivity(session.user.id);
    fetchStats(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setProfile({
        name: data.name || "",
        email: data.email || "",
        bio: data.bio || "",
      });

      if (data.profile_pic) {
        setProfilePicUrl(data.profile_pic);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedContent = async (userId: string) => {
    try {
      const [mezmursRes, postsRes, announcementsRes, podcastsRes] = await Promise.all([
        supabase.from("saved_mezmurs").select("*, mezmurs(*)").eq("user_id", userId),
        supabase.from("saved_posts").select("*, posts(*)").eq("user_id", userId),
        supabase.from("saved_announcements").select("*, announcements(*)").eq("user_id", userId),
        supabase.from("saved_podcasts").select("*, podcasts(*)").eq("user_id", userId),
      ]);

      setSavedMezmurs(mezmursRes.data || []);
      setSavedPosts(postsRes.data || []);
      setSavedAnnouncements(announcementsRes.data || []);
      setSavedPodcasts(podcastsRes.data || []);
    } catch (error) {
      console.error("Error fetching saved content:", error);
    }
  };

  const fetchActivity = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivityData(data || []);
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      const [postsRes, commentsRes, likesRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("likes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const savedTotal = 
        savedMezmurs.length + 
        savedPosts.length + 
        savedAnnouncements.length + 
        savedPodcasts.length;

      setStats({
        postsCreated: postsRes.count || 0,
        commentsAdded: commentsRes.count || 0,
        likesGiven: likesRes.count || 0,
        savedItems: savedTotal
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_pic: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfilePicUrl(publicUrl);
      toast.success("Profile picture updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          bio: profile.bio,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRemoveSaved = async (type: string, id: string) => {
    try {
      const table = `saved_${type}` as any;
      const { error } = await supabase.from(table).delete().eq("id", id);
      
      if (error) throw error;
      
      // Refresh saved content
      if (user) fetchSavedContent(user.id);
      toast.success("Item removed from saved");
    } catch (error: any) {
      toast.error("Failed to remove item");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">Manage your profile and saved content</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="saved">
            <BookmarkIcon className="h-4 w-4 mr-2" />
            Saved
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details and picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profilePicUrl || undefined} />
                  <AvatarFallback className="text-4xl">
                    {profile.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Input
                    type="file"
                    id="profile-pic"
                    accept="image/*"
                    onChange={handleProfilePicUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Label htmlFor="profile-pic">
                    <Button variant="outline" disabled={uploading} asChild>
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Picture
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>

              {/* Profile Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile.email} disabled />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.postsCreated}</p>
                  <p className="text-sm text-muted-foreground">Posts Created</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.commentsAdded}</p>
                  <p className="text-sm text-muted-foreground">Comments</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.likesGiven}</p>
                  <p className="text-sm text-muted-foreground">Likes Given</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.savedItems}</p>
                  <p className="text-sm text-muted-foreground">Saved Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Content Tab */}
        <TabsContent value="saved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Mezmurs</CardTitle>
              <CardDescription>{savedMezmurs.length} mezmurs saved</CardDescription>
            </CardHeader>
            <CardContent>
              {savedMezmurs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No saved mezmurs yet</p>
              ) : (
                <div className="space-y-2">
                  {savedMezmurs.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Music className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{item.mezmurs.title}</p>
                          <p className="text-sm text-muted-foreground">{item.mezmurs.artist}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSaved("mezmurs", item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Posts</CardTitle>
              <CardDescription>{savedPosts.length} posts saved</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No saved posts yet</p>
              ) : (
                <div className="space-y-2">
                  {savedPosts.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <p className="font-medium">{item.posts.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSaved("posts", item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Announcements</CardTitle>
              <CardDescription>{savedAnnouncements.length} announcements saved</CardDescription>
            </CardHeader>
            <CardContent>
              {savedAnnouncements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No saved announcements yet</p>
              ) : (
                <div className="space-y-2">
                  {savedAnnouncements.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-primary" />
                        <p className="font-medium">{item.announcements.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSaved("announcements", item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Podcasts</CardTitle>
              <CardDescription>{savedPodcasts.length} podcasts saved</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPodcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No saved podcasts yet</p>
              ) : (
                <div className="space-y-2">
                  {savedPodcasts.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <PodcastIcon className="h-5 w-5 text-primary" />
                        <p className="font-medium">{item.podcasts.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSaved("podcasts", item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent interactions and engagements</CardDescription>
            </CardHeader>
            <CardContent>
              {activityData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {activityData.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Activity className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">{activity.activity_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievements Section */}
      <div className="mt-8">
        <AchievementDisplay
          achievements={achievements}
          userAchievements={userAchievements}
          loading={achievementsLoading}
        />
      </div>

      {/* Recommendations Section */}
      {user && (
        <div className="mt-8">
          <RecommendationSection userId={user.id} />
        </div>
      )}
    </div>
  );
}
