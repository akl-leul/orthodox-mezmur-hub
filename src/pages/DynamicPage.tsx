import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export default function DynamicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;

      if (!data.published) {
        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!roleData) {
            toast.error("This page is not published");
            navigate("/");
            return;
          }
        } else {
          toast.error("This page is not published");
          navigate("/");
          return;
        }
      }

      setPage(data);

      // Check if password is required
      if (data.password) {
        const sessionPassword = sessionStorage.getItem(`page-${data.id}`);
        if (sessionPassword === data.password) {
          setAuthenticated(true);
        } else {
          setNeedsPassword(true);
        }
      } else {
        setAuthenticated(true);
      }
    } catch (error: any) {
      toast.error("Page not found");
      navigate("/");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === page.password) {
      sessionStorage.setItem(`page-${page.id}`, password);
      setAuthenticated(true);
      setNeedsPassword(false);
    } else {
      toast.error("Incorrect password");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div>Loading...</div>
      </div>
    );
  }

  if (needsPassword && !authenticated) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md">
        <div className="border rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">{page.title}</h1>
          <p className="text-muted-foreground mb-6">
            This page is password protected. Please enter the password to continue.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Access Page
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!page || !authenticated) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
        <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
          {page.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
