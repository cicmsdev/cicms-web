"use client";

import { useAuth } from "../../context/AuthContext";

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-gray-600">
        {/* Left */}
        <span>
          © {new Date().getFullYear()} CICMS. All rights reserved.
        </span>

        {/* Center: Logged-in user */}
        {user && (
          <div className="text-gray-700">
            Logged in as{" "}
            <span className="font-medium text-gray-900">
              {user.name}
            </span>
            {user.role && (
              <>
                {" "}
                · <span className="capitalize">{user.role.toLowerCase()}</span>
              </>
            )}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-gray-900">
            Privacy
          </a>
          <a href="#" className="hover:text-gray-900">
            Terms
          </a>
          <a href="#" className="hover:text-gray-900">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
