import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserProfile> | null>(
    null,
  );
  const [filter, setFilter] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Failed to fetch users.");
      console.error("Error fetching users:", profilesError);
      setLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
    const usersWithRoles: UserProfile[] = (profiles || []).map(profile => ({
      ...profile,
      role: (rolesMap.get(profile.id) as "user" | "admin") || "user",
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user: UserProfile) => {
    setCurrentUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    )
      return;

    try {
      // Delete from user_roles table first
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id);
      if (roleError) throw roleError;

      // Then, delete from profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      if (profileError) throw profileError;

      // Note: Deleting from `auth.users` directly from the client is generally not recommended
      // and requires a service role key or a secure backend function.
      // For a client-side admin panel, we assume RLS is set up to handle cascading deletes
      // or that the Supabase setup implies profile/role deletion is sufficient.
      // If full auth.users deletion is required, it should be done via a secure server-side call.

      toast.success("User deleted successfully (profile and roles).");
      fetchUsers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Failed to delete user: " + error.message);
        console.error("Error deleting user:", error);
      } else {
        toast.error("Failed to delete user: An unknown error occurred.");
        console.error("Unknown error deleting user:", error);
      }
    }
  };

  const handleSaveUser = async () => {
    if (!currentUser?.id || !currentUser?.name || !currentUser?.role) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: currentUser.name })
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      // Update or insert role in user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: currentUser.id, role: currentUser.role },
          { onConflict: "user_id" },
        );

      if (roleError) throw roleError;

      toast.success("User updated successfully.");
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Failed to update user: " + error.message);
        console.error("Error updating user:", error);
      } else {
        toast.error("Failed to update user: An unknown error occurred.");
        console.error("Unknown error updating user:", error);
      }
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(filter.toLowerCase()) ||
      user.email.toLowerCase().includes(filter.toLowerCase()) ||
      user.role.toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Filter users..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        {/* No "Add User" button for direct creation, as user creation is typically via auth.signup */}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentUser?.id ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={currentUser?.name || ""}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                value={currentUser?.email || ""}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={currentUser?.role || ""}
                onValueChange={(value) =>
                  setCurrentUser({
                    ...currentUser,
                    role: value as "user" | "admin",
                  })
                }
              >
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
