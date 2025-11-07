import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AudioPlayerProvider } from "@/contexts/GlobalAudioPlayerContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Mezmurs from "./pages/Mezmurs";
import Posts from "./pages/Posts";
import PostDetail from "./pages/PostDetail";
import Announcements from "./pages/Announcements";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Quizzes from "@/pages/Quizzes";
import QuizTaking from "@/pages/QuizTaking";
import Leaderboard from "@/pages/Leaderboard";
import NotFound from "@/pages/NotFound";
import DynamicPage from "./pages/DynamicPage";
import Podcasts from "./pages/Podcasts";
import Discussions from "./pages/Discussions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AudioPlayerProvider>
        {" "}
        {/* Wrap the BrowserRouter with AudioPlayerProvider */}
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/mezmurs" element={<Mezmurs />} />
              <Route path="/posts" element={<Posts />} />
              <Route path="/posts/:slug" element={<PostDetail />} />
              <Route path="/discussions" element={<Discussions />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/quiz/:quizId" element={<QuizTaking />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/podcasts" element={<Podcasts />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/page/:slug" element={<DynamicPage />} />
            </Route>
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AudioPlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
