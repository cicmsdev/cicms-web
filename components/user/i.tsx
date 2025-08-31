"use client";

import { useState } from "react";
import {
  Bell,
  FileText,
  Folder,
  Home,
  Menu,
  Search,
  User,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import  Button  from "../../components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";

type Claim = {
  id: string;
  project: string;
  status: "submitted" | "review" | "approved" | "rejected";
  incidentDate: string;
  documents: string[];
};

export default function ContractorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const claims: Claim[] = [
    {
      id: "CLM-101",
      project: "Hospital Expansion",
      status: "review",
      incidentDate: "2025-08-10",
      documents: ["incident-report.pdf", "budget.xlsx"],
    },
    {
      id: "CLM-102",
      project: "Bridge Maintenance",
      status: "submitted",
      incidentDate: "2025-08-12",
      documents: ["photos.zip"],
    },
    {
      id: "CLM-103",
      project: "Road Upgrade",
      status: "approved",
      incidentDate: "2025-08-15",
      documents: ["contract.pdf"],
    },
    {
      id: "CLM-104",
      project: "Power Station",
      status: "rejected",
      incidentDate: "2025-08-20",
      documents: ["invoice.pdf"],
    },
  ];

  // For quick stats
  const statusCounts = {
    submitted: claims.filter((c) => c.status === "submitted").length,
    review: claims.filter((c) => c.status === "review").length,
    approved: claims.filter((c) => c.status === "approved").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0a2045] text-white flex justify-between items-center px-6 py-4 shadow">
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6" />
          <h1 className="text-xl font-bold">Contractor Dashboard</h1>
        </div>
        <div className="flex items-center gap-6">
          <Search className="h-5 w-5 cursor-pointer" />
          <Bell className="h-5 w-5 cursor-pointer" />
          <User className="h-5 w-5 cursor-pointer" />
        </div>
      </header>

      {/* Nav Tabs */}
      <nav className="flex justify-center bg-white border-b shadow-sm">
        {[
          { id: "overview", label: "Overview", icon: Home },
          { id: "claims", label: "Claims", icon: FileText },
          { id: "documents", label: "Documents", icon: Folder },
          { id: "notifications", label: "Notifications", icon: Bell },
        ].map((tab) => (
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

      {/* Content */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <aside className="col-span-3 bg-white p-4 rounded-2xl shadow">
          <h2 className="font-semibold mb-4">Filters</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium mb-2">Status</h3>
              <div className="flex flex-col gap-2 text-sm text-gray-600">
                <label>
                  <input type="checkbox" /> Submitted
                </label>
                <label>
                  <input type="checkbox" /> In Review
                </label>
                <label>
                  <input type="checkbox" /> Approved
                </label>
                <label>
                  <input type="checkbox" /> Rejected
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <section className="col-span-9 space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="Submitted Claims"
              value={statusCounts.submitted}
              color="bg-blue-500"
              icon={Clock}
            />
            <StatCard
              title="In Review"
              value={statusCounts.review}
              color="bg-yellow-500"
              icon={FileText}
            />
            <StatCard
              title="Approved"
              value={statusCounts.approved}
              color="bg-green-500"
              icon={CheckCircle2}
            />
            <StatCard
              title="Rejected"
              value={statusCounts.rejected}
              color="bg-red-500"
              icon={XCircle}
            />
          </div>

          {/* Claim Cards */}
          <div className="grid grid-cols-2 gap-6">
            {claims.map((claim) => (
              <motion.div
                key={claim.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl shadow-md p-4 border border-gray-100"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-800">{claim.project}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      claim.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : claim.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : claim.status === "review"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {claim.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Incident: {claim.incidentDate}</p>
                <div className="mt-3 flex gap-2 flex-wrap text-xs text-gray-600">
                  {claim.documents.map((doc, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 rounded-full"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    label="View Details"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    
                  </Button>
                  <Button size="sm" label="">Upload</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Slide-out Claim Detail */}
      {selectedClaim && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          className="fixed top-0 right-0 h-full w-1/3 bg-white shadow-2xl p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">
              Claim {selectedClaim.id}
            </h2>
            <button onClick={() => setSelectedClaim(null)}>
              <XCircle className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Project: {selectedClaim.project}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Incident: {selectedClaim.incidentDate}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Status: {selectedClaim.status}
          </p>
          <h3 className="font-medium mb-2">Documents</h3>
          <ul className="space-y-2">
            {selectedClaim.documents.map((doc, idx) => (
              <li key={idx} className="p-2 bg-gray-100 rounded">
                {doc}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
  icon: Icon,
}: {
  title: string;
  value: number;
  color: string;
  icon: any;
}) {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`${color} p-3 rounded-xl text-white`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-xl font-bold">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}


