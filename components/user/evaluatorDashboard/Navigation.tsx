"use client";
import * as React from "react";
import { Home, FileText, Folder, Bell, MessageCircleIcon } from "lucide-react";

export type Tab = "overview" | "claims" | "messages" | "notifications";

type Props = {
  activeTab: Tab;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
  notifCount?: number;
  messagesCount?: number; 
};

type NavItem = { id: Tab; label: string; icon: React.ComponentType<any> };

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "claims", label: "Claims", icon: FileText },
  { id: "messages", label: "Messages", icon: MessageCircleIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function Navigation({
  activeTab,
  setActiveTab,
  notifCount = 0,
  messagesCount = 0, 
}: Props) {
  return (
    <nav className="hidden md:flex justify-center bg-white border-b shadow-sm">
      {navItems.map((tab) => {
        const isNotif = tab.id === "notifications";
        const isMessages = tab.id === "messages";

        // Decide whether to show a badge and which count to use
        const showBadge =
          (isNotif && notifCount > 0) || (isMessages && messagesCount > 0);
        const badgeValue = isNotif ? notifCount : isMessages ? messagesCount : 0;

        return (
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
            {showBadge && (
              <span className="ml-2 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                {badgeValue > 99 ? "99+" : badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
