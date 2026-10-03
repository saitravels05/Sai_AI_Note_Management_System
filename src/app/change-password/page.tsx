"use client";

import React, { useState } from "react";
import Image from "next/image";
import { changePasswordAction } from "@/server/actions/auth.actions";
import { ShieldAlert, Lock, Loader2, AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await changePasswordAction(formData);
      if (!res.success) {
        setError(res.error || "Password update failed");
        setIsLoading(false);
      } else if (res.redirectTo) {
        window.location.href = res.redirectTo;
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Mandatory Password Update
        </h2>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          Security requirement: As this is your first sign-in, you must replace the temporary setup password with your own secure password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl rounded-3xl border border-gray-100 dark:border-gray-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                New Secure Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  name="newPassword"
                  required
                  placeholder="Min 8 characters"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save & Enter SAI Books</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
