"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth.actions";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAction(formData);
      if (!res.success) {
        setError(res.error || "Login failed");
        setIsLoading(false);
      } else if (res.redirectTo) {
        window.location.href = res.redirectTo;
      }
    } catch (err: any) {
      console.error("[LOGIN ERROR]", err);
      const raw = String(err?.message || "");
      if (raw.includes("441") || raw.includes("Minified React error") || raw.includes("Server Components")) {
        setError(
          "Database connection error: The server could not connect to PostgreSQL. Please ensure the database is running (run 'npm run db:start')."
        );
      } else {
        setError(err.message || "An unexpected error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Container */}
        <div className="mx-auto w-24 h-24 relative mb-4 rounded-2xl overflow-hidden shadow-lg border border-orange-200 dark:border-orange-900 bg-white p-1">
          <Image
            src="/brand/logo.jpg"
            alt="Sai Tours and Travels Logo"
            width={96}
            height={96}
            className="object-contain w-full h-full"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Sign in to SAI Books
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sai Tours & Travels • Notes & Accounts Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl rounded-3xl border border-gray-100 dark:border-gray-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue="saipassportmdu@gmail.com"
                  placeholder="name@saitravelservices.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  required
                  defaultValue="TemporarySetupPassword123!"
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-orange-600 hover:underline">
              Register Staff Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
