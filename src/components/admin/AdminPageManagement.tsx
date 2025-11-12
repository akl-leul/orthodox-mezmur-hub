import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  Navigation, 
  LayoutGrid,
  Loader2,
  ExternalLink
} from "lucide-react";

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
  created_at: string;
  updated_at: string;
  created_by: string;
}

const AdminPageManagement: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Partial<Page> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("nav_order", { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch pages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePage = async () => {
    if (!currentPage?.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!currentPage?.slug?.trim()) {
      toast.error("Slug is required");
      return;
    }
    if (!currentPage?.content?.trim()) {
      toast.error("Content is required");
      return;
    }

    setSaving(true);
    try {
      if (currentPage.id) {
        // Update existing page
        const { error } = await supabase
          .from("pages")
          .update({
            title: currentPage.title.trim(),
            slug: currentPage.slug.trim(),
            content: currentPage.content.trim(),
            password: currentPage.password || null,
            published: currentPage.published,
            show_in_nav: currentPage.show_in_nav,
            show_in_footer: currentPage.show_in_footer,
            nav_order: currentPage.nav_order || 0,
            footer_order: currentPage.footer_order || 0,
          })
          .eq("id", currentPage.id);

        if (error) throw error;
        toast.success("Page updated successfully");
      } else {
        // Create new page
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase
          .from("pages")
          .insert({
            title: currentPage.title.trim(),
            slug: currentPage.slug.trim(),
            content: currentPage.content.trim(),
            password: currentPage.password || null,
            published: currentPage.published || false,
            show_in_nav: currentPage.show_in_nav !== false,
            show_in_footer: currentPage.show_in_footer !== false,
            nav_order: currentPage.nav_order || 0,
            footer_order: currentPage.footer_order || 0,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Page created successfully");
      }

      setIsDialogOpen(false);
      setCurrentPage(null);
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to save page: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPage = (page: Page) => {
    setCurrentPage(page);
    setIsDialogOpen(true);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("pages")
        .delete()
        .eq("id", pageId);

      if (error) throw error;
      toast.success("Page deleted successfully");
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to delete page: " + error.message);
    }
  };

  const handleTogglePublish = async (page: Page) => {
    try {
      const { error } = await supabase
        .from("pages")
        .update({ published: !page.published })
        .eq("id", page.id);

      if (error) throw error;
      toast.success(`Page ${page.published ? 'unpublished' : 'published'} successfully`);
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to update page: " + error.message);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Page Management
            </CardTitle>
            <CardDescription>
              Create, edit, and manage website pages
            </CardDescription>
          </div>
          <Button onClick={() => {
            setCurrentPage({
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
            setIsDialogOpen(true);
          }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Page
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-8">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pages found</p>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPage({
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
                setIsDialogOpen(true);
              }}
              className="mt-4"
            >
              Create your first page
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Navigation</TableHead>
                <TableHead>Footer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={page.published}
                        onCheckedChange={() => handleTogglePublish(page)}
                      />
                      <span className="text-sm">
                        {page.published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      <span className="text-sm">
                        {page.show_in_nav ? "Yes" : "No"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="text-sm">
                        {page.show_in_footer ? "Yes" : "No"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      Nav: {page.nav_order} / Footer: {page.footer_order}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/pages/${page.slug}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPage(page)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePage(page.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Page Editor Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentPage?.id ? "Edit Page" : "Create New Page"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={currentPage?.title || ""}
                    onChange={(e) => {
                      const title = e.target.value;
                      setCurrentPage({ 
                        ...currentPage, 
                        title,
                        slug: generateSlug(title)
                      });
                    }}
                    placeholder="Enter page title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={currentPage?.slug || ""}
                    onChange={(e) => setCurrentPage({ ...currentPage, slug: e.target.value })}
                    placeholder="url-friendly-page-title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={currentPage?.content || ""}
                  onChange={(e) => setCurrentPage({ ...currentPage, content: e.target.value })}
                  placeholder="Page content (supports Markdown)"
                  rows={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={currentPage?.password || ""}
                    onChange={(e) => setCurrentPage({ ...currentPage, password: e.target.value })}
                    placeholder="Leave empty for public access"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="published"
                        checked={currentPage?.published || false}
                        onCheckedChange={(checked) => setCurrentPage({ ...currentPage, published: checked })}
                      />
                      <Label htmlFor="published">Published</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show_in_nav"
                        checked={currentPage?.show_in_nav !== false}
                        onCheckedChange={(checked) => setCurrentPage({ ...currentPage, show_in_nav: checked })}
                      />
                      <Label htmlFor="show_in_nav">Show in Navigation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show_in_footer"
                        checked={currentPage?.show_in_footer !== false}
                        onCheckedChange={(checked) => setCurrentPage({ ...currentPage, show_in_footer: checked })}
                      />
                      <Label htmlFor="show_in_footer">Show in Footer</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nav_order">Navigation Order</Label>
                  <Input
                    id="nav_order"
                    type="number"
                    value={currentPage?.nav_order || 0}
                    onChange={(e) => setCurrentPage({ ...currentPage, nav_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_order">Footer Order</Label>
                  <Input
                    id="footer_order"
                    type="number"
                    value={currentPage?.footer_order || 0}
                    onChange={(e) => setCurrentPage({ ...currentPage, footer_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setCurrentPage(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSavePage} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : currentPage?.id ? (
                  "Update Page"
                ) : (
                  "Create Page"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminPageManagement;
