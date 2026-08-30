"use client";

import axios from "axios";
import { useFilteredData } from "@/hooks/useFilteredData";
import UserToolbar from "@/components/admin-user/UserToolbar";
import UserAddModal, { UserFormData, } from "@/components/admin-user/UserAddModal";
import { useEffect, useState } from "react";
import type { RootState } from "@/redux/store";
import { getAllUsers, createUser, updateUser, deleteUser } from "@/services/userService";
import { useSelector } from "react-redux";
import UserTable, { UserTableRow } from "@/components/admin-user/UserTable";
import UserDeleteModal from "@/components/admin-user/UserDeleteModal";
import UserReassignModal from "@/components/admin-user/UserReassignModal";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import Navbar from "@/components/dashboard/Navbar";
import Pagination from "@/components/reusable/pagination";


export default function UsersPage() {

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserTableRow[]>([]);
  const token = useSelector((state: RootState) => state.auth.token);
  const [openModal, setOpenModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;


  const [selectedUser, setSelectedUser] =
    useState<UserTableRow | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [userToDelete, setUserToDelete] =
    useState<UserTableRow | null>(null);

  const fetchUsers = async () => {
    if (!token) return;

    try {
      const data = await getAllUsers(token);

      setUsers(data.users);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // ----------------
  // Add User Modal 
  // -----------------

  const handleCreateUser = async (
    userData: UserFormData
  ): Promise<void> => {
    try {
      const response = await createUser(userData, token!);

      await fetchUsers();
      toast.success("User created successfully");
    } catch (error) {
      console.error(error);
    }
  };

  // ------------------
  // Handle Update User
  // ------------------

  const handleUpdateUser = async (
    userData: UserFormData
  ): Promise<void> => {
    if (!selectedUser || !token) return;

    try {
      const response = await updateUser(
        String(selectedUser.id),
        userData,
        token
      );

      setOpenModal(false);
      setIsEditMode(false);
      setSelectedUser(null);

      await fetchUsers();
      toast.success("User updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user");
    }
  };

  // ---------------------
  // Handle Delete User
  // ---------------------

  const handleDeleteUser = async (): Promise<void> => {
    if (!userToDelete || !token) return;

    try {
      const response = await deleteUser(
        String(userToDelete.id),
        token
      );

      toast.success(response.message);

      setDeleteModalOpen(false);
      setUserToDelete(null);

      await fetchUsers();
      toast.success("User deleted successfully");
    } catch (error) {

      if (axios.isAxiosError(error)) {

        const data = error.response?.data;

        // Agar task reassign required hai
        if (error.response?.status === 409 && data?.needsReassign) {
          setDeleteModalOpen(false);
          setReassignModalOpen(true);
          return;
        }

        toast.error(data?.message || "Something went wrong");
        return;
      }

      console.error(error);
      toast.error("Unexpected error");
    }
  };

  const filteredUsers = useFilteredData(users, {
    searchValue,
    searchFields: ["name", "email"],
    filterField: "role",
    filterValue: roleFilter,
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const startIndex = (currentPage - 1) * usersPerPage;

  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + usersPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, roleFilter]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role="admin"
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}>
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="User Management"
        />
        <div className="space-y-6 p-8">

          <UserToolbar
            searchValue={searchValue}
            roleValue={roleFilter}
            onSearchChange={setSearchValue}
            onRoleChange={setRoleFilter}
            onAddUser={() => setOpenModal(true)}
          />

          <UserAddModal
            open={openModal}
            onClose={() => {
              setOpenModal(false);
              setIsEditMode(false);
              setSelectedUser(null);
            }}
            onSubmit={isEditMode ? handleUpdateUser : handleCreateUser}
            isEditMode={isEditMode}
            initialData={selectedUser ?? undefined}
          />

          <UserDeleteModal
            open={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setUserToDelete(null);
            }}
            onConfirm={handleDeleteUser}
            title="Delete User"
            message={
              userToDelete
                ? `Are you sure you want to delete "${userToDelete.name}"? This action cannot be undone.`
                : "Are you sure you want to delete this user?"
            }
          />

          <UserReassignModal
            open={reassignModalOpen}
            userId={userToDelete?.id ? Number(userToDelete.id) : null}
            onClose={() => {
              setReassignModalOpen(false);
              setUserToDelete(null);
            }}
            onSuccess={fetchUsers}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <UserTable
            users={paginatedUsers}
            onEdit={(user) => {
              setSelectedUser(user);
              setIsEditMode(true);
              setOpenModal(true);
            }}
            onDelete={(user) => {
              setUserToDelete(user);
              setDeleteModalOpen(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}