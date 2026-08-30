"use client";

import { useRouter } from "next/navigation";
import { LogIn, ShieldAlert } from "lucide-react";

export default function SessionExpiredModal() {
  const router = useRouter();

  const handleLogin = () => {
    // localStorage.removeItem("accessToken");
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Top Section */}
        <div className="flex flex-col items-center px-8 pb-6 pt-8">
          {/* Icon */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-7 w-7 text-red-600" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Session Expired
          </h2>

          {/* Message */}
          <p className="mt-3 max-w-sm text-center text-sm leading-6 text-gray-500">
            Your session has expired for security reasons. Please login again
            to continue using your account.
          </p>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-100 bg-gray-50 px-8 py-5">
          <button
            type="button"
            onClick={handleLogin}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700 active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" />
            Login Again
          </button>
        </div>
      </div>
    </div>
  );
}