"use client";
import { Home, FileText, Folder, Bell } from "lucide-react";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const navItems = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "claims", label: "Claims", icon: FileText },
  { id: "documents", label: "Documents", icon: Folder },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function Navigation({ activeTab, setActiveTab }: Props) {
  return (
    <nav className="hidden md:flex justify-center bg-white border-b shadow-sm">
      {navItems.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition ${
            activeTab === tab.id
              ? "border-[#0a2045] text-[#0a2045] font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
