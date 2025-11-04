import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  password: string | null;
  published: boolean;
  show_in_nav: boolean;
  show_in_footer: boolean;
  nav_order: number;
  footer_order: number;
}

export default function PageManagement() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    password: "",
    published: true,
    show_in_nav: true,
    show_in_footer: true,
    nav_order: 0,
    footer_order: 0,
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("nav_order", { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch pages");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const pageData = {
        ...formData,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-"),
        password: formData.password || null,
        created_by: user.id,
      };

      if (editingPage) {
        const { error } = await supabase
          .from("pages")
          .update(pageData)
          .eq("id", editingPage.id);

        if (error) throw error;
        toast.success("Page updated successfully");
      } else {
        const { error } = await supabase.from("pages").insert([pageData]);

        if (error) throw error;
        toast.success("Page created successfully");
      }

      fetchPages();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save page");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;

    try {
      const { error } = await supabase.from("pages").delete().eq("id", id);

      if (error) throw error;
      toast.success("Page deleted successfully");
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to delete page");
      console.error(error);
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      password: page.password || "",
      published: page.published,
      show_in_nav: page.show_in_nav,
      show_in_footer: page.show_in_footer,
      nav_order: page.nav_order,
      footer_order: page.footer_order,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPage(null);
    setFormData({
      title: "",
      slug: "",
      content: "",
      password: "",
      published: true,
      show_in_nav: true,
      show_in_footer: true,
      nav_order: 0,
      footer_order: 0,
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("page-content")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("page-content")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image");
      console.error(error);
      return null;
    }
  };

  if (loading) {
    return <div>Loading pages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dynamic Pages</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPage ? "Edit Page" : "Create New Page"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="auto-generated-from-title"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Leave empty for public access"
                />
              </div>

              <div>
                <Label htmlFor="content">Content (Markdown)</Label>
                <div data-color-mode="light">
                  <MDEditor
                    value={formData.content}
                    onChange={(val) =>
                      setFormData({ ...formData, content: val || "" })
                    }
                    height={400}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Tip: Upload images below and copy the URL to insert in markdown: ![alt](url)
                </p>
              </div>

              <div>
                <Label htmlFor="image-upload">Upload Images/Videos</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*,video/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await handleImageUpload(file);
                      if (url) {
                        toast.success(`File uploaded! URL: ${url}`);
                        navigator.clipboard.writeText(url);
                      }
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, published: checked })
                    }
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_in_nav"
                    checked={formData.show_in_nav}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, show_in_nav: checked })
                    }
                  />
                  <Label htmlFor="show_in_nav">Show in Navigation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_in_footer"
                    checked={formData.show_in_footer}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, show_in_footer: checked })
                    }
                  />
                  <Label htmlFor="show_in_footer">Show in Footer</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nav_order">Navigation Order</Label>
                  <Input
                    id="nav_order"
                    type="number"
                    value={formData.nav_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nav_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="footer_order">Footer Order</Label>
                  <Input
                    id="footer_order"
                    type="number"
                    value={formData.footer_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        footer_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPage ? "Update" : "Create"} Page
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {pages.map((page) => (
          <div
            key={page.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <h3 className="font-semibold">{page.title}</h3>
              <p className="text-sm text-muted-foreground">/{page.slug}</p>
              <div className="flex gap-2 mt-2">
                {page.published ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Published
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    Draft
                  </span>
                )}
                {page.password && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Password Protected
                  </span>
                )}
                {page.show_in_nav && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    In Nav
                  </span>
                )}
                {page.show_in_footer && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    In Footer
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(page)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(page.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
