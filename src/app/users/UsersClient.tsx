"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  updateUserStatusAction,
  updateUserRoleAction,
} from "@/server/actions/settings.actions";
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  UserCheck,
  UserX,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Role, UserStatus } from "@prisma/client";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

interface UsersClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  initialUsers: UserItem[];
}

export function UsersClient({ user, initialUsers }: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const pendingCount = users.filter((u) => u.status === UserStatus.PENDING_APPROVAL).length;
  const activeCount = users.filter((u) => u.status === UserStatus.ACTIVE).length;
  const suspendedCount = users.filter((u) => u.status === UserStatus.SUSPENDED).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateUserStatusAction(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to update user status");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await updateUserRoleAction(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to update user role");
    }
  };

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                User Access &amp; Staff Security Desk
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Approve newly registered staff accounts, assign RBAC permissions, and manage active sessions
            </p>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Pending Approval</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Staff waiting for Owner verification</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span className="font-semibold">Active Authorized Staff</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {activeCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Logged in and operating</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Suspended / Deactivated</span>
              <UserX className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {suspendedCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Blocked from system access</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "ALL", label: `All Accounts (${users.length})` },
              { id: UserStatus.PENDING_APPROVAL, label: `Pending (${pendingCount})` },
              { id: UserStatus.ACTIVE, label: `Active (${activeCount})` },
              { id: UserStatus.SUSPENDED, label: `Suspended (${suspendedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  statusFilter === f.id
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 pl-6">Staff Member</th>
                  <th className="py-3.5">Assigned Role</th>
                  <th className="py-3.5">Account Status</th>
                  <th className="py-3.5">Registered Date</th>
                  <th className="py-3.5 text-right pr-6">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No accounts match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.email === user.email;

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{u.email}</div>
                        </td>

                        <td className="py-4">
                          {user.role === "OWNER" && !isSelf ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value as Role)}
                              className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            >
                              <option value={Role.OWNER}>OWNER</option>
                              <option value={Role.ADMIN}>ADMIN</option>
                              <option value={Role.MANAGER}>MANAGER</option>
                              <option value={Role.STAFF}>STAFF</option>
                              <option value={Role.VISITOR}>VISITOR</option>
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                              {u.role}
                            </span>
                          )}
                        </td>

                        <td className="py-4">
                          {u.status === UserStatus.ACTIVE && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                          {u.status === UserStatus.PENDING_APPROVAL && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold animate-pulse">
                              <Clock className="w-3 h-3" />
                              Pending Approval
                            </span>
                          )}
                          {u.status === UserStatus.SUSPENDED && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" />
                              Suspended
                            </span>
                          )}
                        </td>

                        <td className="py-4 text-slate-500 text-[11px] font-mono">{u.createdAt}</td>

                        <td className="py-4 text-right pr-6">
                          {!isSelf && (
                            <div className="flex items-center justify-end gap-2">
                              {u.status === UserStatus.PENDING_APPROVAL && (
                                <button
                                  onClick={() => handleUpdateStatus(u.id, UserStatus.ACTIVE)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {u.status === UserStatus.ACTIVE && (
                                <button
                                  onClick={() => handleUpdateStatus(u.id, UserStatus.SUSPENDED)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-xs transition"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Suspend</span>
                                </button>
                              )}

                              {u.status === UserStatus.SUSPENDED && (
                                <button
                                  onClick={() => handleUpdateStatus(u.id, UserStatus.ACTIVE)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Reactivate</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
