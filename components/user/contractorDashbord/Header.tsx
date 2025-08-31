"use client";
import { Bell, Settings, User, LogOut, Filter, Menu } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";

type Props = {
  onOpenFilter: () => void;
  onOpenNav: () => void;
};

export default function Header({ onOpenFilter, onOpenNav }: Props) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-[#0a2045] text-white p-4 flex items-center justify-between shadow">
      <div className="flex items-center space-x-3">
        {/* Hamburger menu for mobile */}
        <button className="md:hidden" onClick={onOpenNav}>
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Contractor Dashboard</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button
          className="md:hidden flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg text-sm"
          onClick={onOpenFilter}
        >
          <Filter className="h-4 w-4" /> Filters
        </button>
        <button><Bell className="h-5 w-5" /></button>
        <button><Settings className="h-5 w-5" /></button>
        <button><User className="h-5 w-5" /></button>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
