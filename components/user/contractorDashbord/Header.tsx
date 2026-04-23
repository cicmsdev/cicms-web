"use client";
import { Bell, Settings, User, LogOut, Filter, Menu } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useUnreadCount } from "@/hooks/useNotifications";

type Props = {
  onOpenNav: () => void;
  onOpenFilter?: () => void; // ← made optional
};

export default function Header({ onOpenFilter, onOpenNav }: Props) {
  const { logout } = useAuth();
  const router = useRouter();
  const { data } = useUnreadCount();
  const unread = data?.count ?? 0;

  return (
    <header className="bg-[#0a2045] text-white p-4 flex items-center justify-between shadow">
      <div className="flex items-center space-x-3">
        {/* Hamburger menu for mobile */}
        <button className="md:hidden" onClick={onOpenNav} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Contractor Dashboard</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Mobile-only filter button, shown only if handler provided */}
        {onOpenFilter && (
          <button
            className="md:hidden flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg text-sm"
            onClick={onOpenFilter}
            aria-label="Open filters"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        )}

        <button aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 text-xs rounded-full bg-red-500 text-white grid place-items-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        <button aria-label="Settings"><Settings className="h-5 w-5" /></button>
        <button aria-label="Account"><User className="h-5 w-5" /></button>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
