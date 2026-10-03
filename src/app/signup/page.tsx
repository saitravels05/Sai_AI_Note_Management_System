"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signupAction } from "@/server/actions/auth.actions";
import { User, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await signupAction(formData);
      if (!res.success) {
        setError(res.error || "Signup failed");
        setIsLoading(false);
      } else {
        setSuccess("Account submitted! Please wait for Owner (saipassportmdu@gmail.com) approval.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-20 h-20 relative mb-4 rounded-2xl overflow-hidden shadow-lg border border-orange-200 dark:border-orange-900 bg-white p-1">
          <Image
            src="/brand/logo.jpg"
            alt="Sai Tours and Travels Logo"
            width={80}
            height={80}
            className="object-contain w-full h-full"
            priority
          />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Join SAI Books
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Staff Account Registration (Pending Owner Approval)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl rounded-3xl border border-gray-100 dark:border-gray-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-gray-900 dark:text-white">Request Received</h3>
              <p className="text-xs text-gray-500">{success}</p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-orange-600 text-white"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
              </div>

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
                    placeholder="ramesh@saitravelservices.com"
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
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
                <span>Submit Registration</span>
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-orange-600 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
