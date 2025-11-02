import React, { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string; // Assuming email is stored or can be fetched
  role: string;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserProfile> | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch profiles and their associated roles
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        email,
        created_at,
        user_roles ( role )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch users.");
      console.error("Error fetching users:", error);
    } else {
      const usersWithRoles: UserProfile[] = data.map((profile: any) => ({
        id: profile.id,
        username: profile.username,
        email: profile.email,
        created_at: profile.created_at,
        role: profile.user_roles.length > 0 ? profile.user_roles[0].role : "user", // Default to 'user' if no role found
      }));
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const handleEditClick = (user: UserProfile) => {
    setCurrentUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      // First, delete from user_roles table
      const { error: roleError } = await supabase.from("user_roles").delete().eq("user_id", id);
      if (roleError) throw roleError;

      // Then, delete from profiles table
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", id);
      if (profileError) throw profileError;

      // Finally, attempt to delete the user from auth.users (requires service role key or RLS)
      // Note: Direct deletion from auth.users via client-side is generally not allowed without a service role key.
      // For a client-side admin panel, you'd typically rely on RLS to prevent unauthorized deletions or
      // have a backend function that performs this secure deletion.
      // For this example, we'll assume RLS on profiles and user_roles is sufficient for client-side control.
      // If full auth.users deletion is needed, it would be a separate, more privileged operation.
      toast.success("User deleted successfully (profile and roles).");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
      console.error("Error deleting user:", error);
    }
  };

  const handleSaveUser = async () => {
    if (!currentUser?.id || !currentUser?.username || !currentUser?.role) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      // Update username in profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: currentUser.username })
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      // Update or insert role in user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: currentUser.id, role: currentUser.role },
          { onConflict: "user_id" }
        );

      if (roleError) throw roleError;

      toast.success("User updated successfully.");
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update user: " + error.message);
      console.error("Error updating user:", error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(filter.toLowerCase()) ||
    user.email.toLowerCase().includes(filter.toLowerCase()) ||
    user.role.toLowerCase().includes(filter.toLowerCase())
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
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(user.id)}>
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
            <DialogTitle>{currentUser?.id ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={currentUser?.username || ""}
                onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
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
                readOnly // Email is often not directly editable via admin panel once set
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={currentUser?.role || ""}
                onValueChange={(value) => setCurrentUser({ ...currentUser, role: value })}
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
            <Button onClick={handleSaveUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
