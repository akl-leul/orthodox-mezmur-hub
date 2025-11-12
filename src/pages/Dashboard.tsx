import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Loader2,
  Trophy,
  Image,
  MessageSquare,
  Check,
  X,
  Trash2
} from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";
import { AchievementDisplay } from "@/components/AchievementDisplay";
import { RecommendationSection } from "@/components/RecommendationSection";
import { ProfilePictureCropper } from "@/components/ProfilePictureCropper";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({ name: "", email: "", bio: "", gender: "" });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  
  // Profile picture cropping state
  const [showCropper, setShowCropper] = useState(false);
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  
  // Use achievements hook
  const { achievements, userAchievements, loading: achievementsLoading, checkAndAwardAchievement } = useAchievements(user?.id);

  // Saved content
  const [savedMezmurs, setSavedMezmurs] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedAnnouncements, setSavedAnnouncements] = useState<any[]>([]);
  const [savedPodcasts, setSavedPodcasts] = useState<any[]>([]);

  // User's posts for management
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);

  // Enhanced post editor state
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Quiz history
  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  // Activity and stats
  const [activityData, setActivityData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    postsCreated: 0,
    commentsAdded: 0,
    likesGiven: 0,
    savedItems: 0,
    quizPoints: 0,
    totalQuizzesCompleted: 0,
    averageQuizScore: 0,
    totalPoints: 0
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
    fetchQuizStats(session.user.id);
    fetchUserPosts(session.user.id);
    fetchQuizHistory(session.user.id);
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
        gender: data.gender || "",
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

      setStats(prev => ({
        ...prev,
        postsCreated: postsRes.count || 0,
        commentsAdded: commentsRes.count || 0,
        likesGiven: likesRes.count || 0,
        savedItems: savedTotal
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchQuizStats = async (userId: string) => {
    try {
      // Fetch user's quiz attempts
      const { data: quizAttempts, error: quizError } = await supabase
        .from("user_quiz_attempts")
        .select("score, total_questions, correct_answers, quiz_id")
        .eq("user_id", userId);

      if (quizError) throw quizError;

      // Calculate quiz statistics from real data
      const totalQuizzesCompleted = quizAttempts?.length || 0;
      
      // Each quiz is worth exactly 1 point
      const quizPoints = totalQuizzesCompleted;

      const averageScore = totalQuizzesCompleted > 0 
        ? Math.round(quizAttempts!.reduce((sum, attempt) => sum + attempt.score, 0) / totalQuizzesCompleted)
        : 0;

      // Total points is now just quiz points (1 point per quiz)
      const totalPoints = quizPoints;

      setStats(prev => ({
        ...prev,
        quizPoints,
        totalQuizzesCompleted,
        averageQuizScore: averageScore,
        totalPoints
      }));

      // Check for new achievements based on quiz points (but only if we have a function)
      // Note: This is handled by the QuizTaking component to avoid loops
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserPosts(data || []);
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  const fetchQuizHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_quiz_attempts")
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            passing_score
          )
        `)
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setQuizHistory(data || []);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
    }
  };

  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      // Read file and show cropper
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageForCrop(e.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || "Error reading image file");
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    try {
      setUploading(true);
      setShowCropper(false);

      if (!user || !croppedImage) return;

      // Convert data URL to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile-pic.jpg', { type: 'image/jpeg' });

      // Upload to storage with timestamp to avoid caching
      const timestamp = Date.now();
      const fileExt = 'jpg';
      const filePath = `${user.id}/avatar-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_pic: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Refresh profile data from database
      await fetchProfile(user.id);
      
      setProfilePicUrl(publicUrl + `?t=${timestamp}`); // Add timestamp to prevent caching
      toast.success("Profile picture updated successfully!");
      
      // Clean up
      setImageForCrop(null);
    } catch (error: any) {
      toast.error(error.message || "Error uploading profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageForCrop(null);
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
      
      // Refresh saved content and stats
      if (user) {
        fetchSavedContent(user.id);
        fetchStats(user.id);
      }
      toast.success("Item removed from saved");
    } catch (error: any) {
      toast.error("Failed to remove item");
    }
  };

  const refreshDashboard = async () => {
    if (user) {
      await Promise.all([
        fetchProfile(user.id),
        fetchSavedContent(user.id),
        fetchActivity(user.id),
        fetchStats(user.id),
        fetchQuizStats(user.id),
        fetchUserPosts(user.id),
        fetchQuizHistory(user.id)
      ]);
    }
  };

  const handleEditPost = (post: any) => {
    setCurrentPost(post);
    setShowPostEditor(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
      
      toast.success("Post deleted successfully");
      fetchUserPosts(user!.id);
      fetchStats(user!.id);
    } catch (error: any) {
      toast.error("Failed to delete post: " + error.message);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleSavePost = async () => {
    if (!currentPost?.title?.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      if (currentPost.id) {
        // Update existing post
        const { error } = await supabase
          .from("posts")
          .update({
            title: currentPost.title,
            content: currentPost.content || "",
            excerpt: currentPost.excerpt || "",
            featured_image: currentPost.featured_image || "",
            slug: generateSlug(currentPost.title),
            updated_at: new Date().toISOString()
          })
          .eq("id", currentPost.id);

        if (error) throw error;
        toast.success("Post updated successfully");
      } else {
        // Create new post
        const { error } = await supabase
          .from("posts")
          .insert({
            title: currentPost.title,
            content: currentPost.content || "",
            excerpt: currentPost.excerpt || "",
            featured_image: currentPost.featured_image || "",
            slug: generateSlug(currentPost.title),
            author_id: user!.id,
            published: false
          });

        if (error) throw error;
        toast.success("Post created successfully");
      }

      setShowPostEditor(false);
      setCurrentPost(null);
      setImageFile(null);
      fetchUserPosts(user!.id);
      fetchStats(user!.id);
    } catch (error: any) {
      toast.error("Failed to save post: " + error.message);
    }
  };

  const handleTogglePublish = async (post: any) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ published: !post.published })
        .eq("id", post.id);

      if (error) throw error;
      
      toast.success(`Post ${post.published ? 'unpublished' : 'published'} successfully`);
      fetchUserPosts(user!.id);
    } catch (error: any) {
      toast.error("Failed to update post: " + error.message);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImage(true);
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/post-images/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      // Update current post with image URL
      setCurrentPost(prev => ({
        ...prev,
        featured_image: publicUrl
      }));

      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchPostComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPostComments(data || []);
    } catch (error) {
      console.error("Error fetching post comments:", error);
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ approved: true, suspended: false })
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment approved");
      if (selectedPostForComments) {
        fetchPostComments(selectedPostForComments.id);
      }
    } catch (error: any) {
      toast.error("Failed to approve comment: " + error.message);
    }
  };

  const handleRejectComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment deleted successfully");
      if (selectedPostForComments) {
        fetchPostComments(selectedPostForComments.id);
      }
    } catch (error: any) {
      toast.error("Failed to delete comment: " + error.message);
    }
  };

  const handleSuspendComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to suspend this comment? It will be hidden from public view.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("comments")
        .update({ approved: false, suspended: true })
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment suspended successfully");
      if (selectedPostForComments) {
        fetchPostComments(selectedPostForComments.id);
      }
    } catch (error: any) {
      toast.error("Failed to suspend comment: " + error.message);
    }
  };

  const handleUnsuspendComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ approved: false, suspended: false })
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment unsuspended and moved to pending");
      if (selectedPostForComments) {
        fetchPostComments(selectedPostForComments.id);
      }
    } catch (error: any) {
      toast.error("Failed to unsuspend comment: " + error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including posts, quiz attempts, achievements, and profile information.")) {
      return;
    }

    if (!confirm("This is your final warning. All your data will be permanently deleted. Type 'DELETE' to confirm.")) {
      return;
    }

    try {
      const confirmation = prompt("Please type 'DELETE' to confirm account deletion:");
      if (confirmation !== 'DELETE') {
        toast.error("Account deletion cancelled");
        return;
      }

      // Delete user's data from all tables
      const userId = user!.id;
      
      // Delete user's posts
      await supabase.from("posts").delete().eq("author_id", userId);
      
      // Delete user's quiz attempts and answers
      await supabase.from("user_quiz_answers").delete().eq("attempt_id", 
        (await supabase.from("user_quiz_attempts").select("id").eq("user_id", userId)).data?.map(a => a.id) || []
      );
      await supabase.from("user_quiz_attempts").delete().eq("user_id", userId);
      
      // Delete user's achievements
      await supabase.from("user_achievements").delete().eq("user_id", userId);
      
      // Delete user's saved content
      await supabase.from("saved_mezmurs").delete().eq("user_id", userId);
      await supabase.from("saved_posts").delete().eq("user_id", userId);
      await supabase.from("saved_announcements").delete().eq("user_id", userId);
      await supabase.from("saved_podcasts").delete().eq("user_id", userId);
      
      // Delete user's activity
      await supabase.from("user_activity").delete().eq("user_id", userId);
      
      // Delete user's profile
      await supabase.from("profiles").delete().eq("id", userId);
      
      // Finally, delete the user's auth account
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;
      
      toast.success("Account deleted successfully");
      
      // Sign out and redirect to home
      await supabase.auth.signOut();
      navigate("/");
      
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account: " + error.message);
    }
  };

  const handleExportData = async () => {
    try {
      const userId = user!.id;
      
      // Fetch all user data
      const [profile, posts, attempts, achievements, savedContent] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("posts").select("*").eq("author_id", userId),
        supabase.from("user_quiz_attempts").select("*").eq("user_id", userId),
        supabase.from("user_achievements").select("*, achievements(*)").eq("user_id", userId),
        Promise.all([
          supabase.from("saved_mezmurs").select("*").eq("user_id", userId),
          supabase.from("saved_posts").select("*").eq("user_id", userId),
          supabase.from("saved_announcements").select("*").eq("user_id", userId),
          supabase.from("saved_podcasts").select("*").eq("user_id", userId),
        ])
      ]);
      
      const userData = {
        profile: profile.data,
        posts: posts.data,
        quizAttempts: attempts.data,
        achievements: achievements.data,
        savedContent: savedContent.flat().map(item => item.data).flat(),
        exportDate: new Date().toISOString()
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-account-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Account data exported successfully");
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data: " + error.message);
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
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="myposts">
            <FileText className="h-4 w-4 mr-2" />
            My Posts
          </TabsTrigger>
          <TabsTrigger value="quizhistory">
            <Trophy className="h-4 w-4 mr-2" />
            Quiz History
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
                          "Upload Picture"
                        )}
                      </span>
                    </Button>
                  </Label>
                </div>
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

              {/* Quiz Stats Section */}
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Quiz Performance & Points
                  </h3>
                  <Button variant="outline" size="sm" onClick={refreshDashboard}>
                    Refresh Stats
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{stats.quizPoints}</p>
                    <p className="text-sm text-muted-foreground">Quiz Points</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{stats.totalQuizzesCompleted}</p>
                    <p className="text-sm text-muted-foreground">Quizzes Completed</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{stats.averageQuizScore}%</p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">{userAchievements.length}</p>
                    <p className="text-sm text-muted-foreground">Achievements</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Quiz Points</p>
                      <p className="text-2xl font-bold text-primary">
                        {stats.totalPoints}
                      </p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    1 point per quiz completed
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Posts Tab */}
        <TabsContent value="myposts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Posts</CardTitle>
                  <CardDescription>Manage your blog posts and articles</CardDescription>
                </div>
                <Button onClick={() => setShowPostEditor(true)}>
                  Create New Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {userPosts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't created any posts yet</p>
                  <Button onClick={() => setShowPostEditor(true)}>
                    Create Your First Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post: any) => (
                    <div key={post.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{post.title}</h3>
                            {post.published ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                Published
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                          {post.excerpt && (
                            <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                            {post.updated_at !== post.created_at && (
                              <span>Updated: {new Date(post.updated_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePublish(post)}
                          >
                            {post.published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPostForComments(post);
                              fetchPostComments(post.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Comments
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPost(post)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Post Editor Dialog */}
          <Dialog open={showPostEditor} onOpenChange={setShowPostEditor}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{currentPost?.id ? "Edit Post" : "Create New Post"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Title *</Label>
                  <Input
                    id="title"
                    value={currentPost?.title || ""}
                    onChange={(e) => {
                      const title = e.target.value;
                      setCurrentPost({ 
                        ...currentPost, 
                        title,
                        slug: generateSlug(title)
                      });
                    }}
                    className="col-span-3"
                    placeholder="Enter post title"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="slug" className="text-right">Slug</Label>
                  <Input
                    id="slug"
                    value={currentPost?.slug || ""}
                    onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                    className="col-span-3"
                    placeholder="url-friendly-post-title"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="excerpt" className="text-right">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={currentPost?.excerpt || ""}
                    onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                    className="col-span-3"
                    placeholder="Brief description of the post"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content" className="text-right">Content</Label>
                  <Textarea
                    id="content"
                    value={currentPost?.content || ""}
                    onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
                    className="col-span-3"
                    placeholder="Write your post content here (Markdown supported)"
                    rows={10}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image" className="text-right">Featured Image</Label>
                  <div className="col-span-3 space-y-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading image...
                      </div>
                    )}
                    {currentPost?.featured_image && (
                      <div className="mt-2">
                        <img 
                          src={currentPost.featured_image} 
                          alt="Featured" 
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPostEditor(false);
                    setCurrentPost(null);
                    setImageFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSavePost} disabled={!currentPost?.title?.trim()}>
                  {currentPost?.id ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Enhanced Comment Management Modal */}
          {selectedPostForComments && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Comments for "{selectedPostForComments.title}"</CardTitle>
                        <CardDescription>Manage comments on your post - approve, suspend, or delete</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPostForComments(null);
                          setPostComments([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {postComments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No comments yet for this post</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {postComments.map((comment: any) => (
                          <div key={comment.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">Comment by User</span>
                                  {comment.suspended ? (
                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                      Suspended
                                    </span>
                                  ) : comment.approved ? (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                                      Pending Approval
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm mb-2">{comment.content}</p>
                                <p className="text-xs text-muted-foreground">
                                  Posted: {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!comment.approved && !comment.suspended && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApproveComment(comment.id)}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSuspendComment(comment.id)}
                                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Suspend
                                    </Button>
                                  </>
                                )}
                                {comment.suspended && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnsuspendComment(comment.id)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Unsuspend
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRejectComment(comment.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Quiz History Tab */}
        <TabsContent value="quizhistory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz History</CardTitle>
              <CardDescription>Your quiz attempts and scores</CardDescription>
            </CardHeader>
            <CardContent>
              {quizHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't taken any quizzes yet</p>
                  <Button onClick={() => navigate("/quizzes")}>
                    Take Your First Quiz
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizHistory.map((attempt: any) => (
                    <div key={attempt.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{attempt.quizzes?.title || "Unknown Quiz"}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              attempt.score >= (attempt.quizzes?.passing_score || 70)
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {attempt.score >= (attempt.quizzes?.passing_score || 70) ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          {attempt.quizzes?.description && (
                            <p className="text-sm text-muted-foreground mb-2">{attempt.quizzes.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Score: {attempt.score}%</span>
                            <span>Correct: {attempt.correct_answers}/{attempt.total_questions}</span>
                            <span>Time: {Math.floor((attempt.time_taken || 0) / 60)}m {((attempt.time_taken || 0) % 60)}s</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Completed: {new Date(attempt.completed_at).toLocaleDateString()}</span>
                            <span>at {new Date(attempt.completed_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            attempt.score >= 90 ? 'text-green-600' :
                            attempt.score >= 70 ? 'text-blue-600' :
                            attempt.score >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {attempt.score}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {attempt.score >= 90 ? 'Excellent!' :
                             attempt.score >= 70 ? 'Good Job!' :
                             attempt.score >= 50 ? 'Keep Practicing!' :
                             'Try Again'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>Manage your account data and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Export Your Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download a copy of all your personal data including posts, quiz attempts, achievements, and profile information.
                </p>
                <Button variant="outline" onClick={handleExportData}>
                  Export All Data
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2 text-red-600">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Picture Cropper */}
      {showCropper && imageForCrop && (
        <ProfilePictureCropper
          imageSrc={imageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Achievement Display */}
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
};

export default Dashboard;
