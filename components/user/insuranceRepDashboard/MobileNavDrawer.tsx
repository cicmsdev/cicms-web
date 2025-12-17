"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Home, FileText, Folder, Bell, MessageCircleIcon } from "lucide-react";
import type { Tab } from "./Navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  activeTab: Tab;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
};

const navItems: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "claims", label: "Claims", icon: FileText },
  { id: "messages", label: "Messages", icon: MessageCircleIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function MobileNavDrawer({
  open,
  onClose,
  activeTab,
  setActiveTab,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 w-72 h-full bg-white shadow-lg z-50"
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-semibold text-gray-800">Navigation</h2>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex flex-col p-4 space-y-4">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id); // tab.id is Tab, matches setter type
                  onClose();
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  activeTab === tab.id
                    ? "bg-[#0a2045] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
