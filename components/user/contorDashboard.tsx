"use client";

import { useState } from "react";
import {
  Bell,
  FileText,
  LogOut,
  Settings,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Home,
  Folder,
  Filter,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

type Claim = {
  id: string;
  project: string;
  status: "Submitted" | "In Review" | "Approved" | "Rejected";
  incidentDate: string;
  documents: number;
};

const ContractorDashboard = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("claims");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [filters, setFilters] = useState({
    status: [] as string[],
    project: "",
    date: "",
  });
  const [sortKey, setSortKey] = useState("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsTab, setDetailsTab] = useState("overview");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // NEW
  const itemsPerPage = 6;

  // Sample claims
  const claims: Claim[] = Array.from({ length: 18 }, (_, i) => ({
    id: `C-${1000 + i}`,
    project: ["Road Expansion", "Bridge Repair", "Hospital Build"][i % 3],
    status: ["Submitted", "In Review", "Approved", "Rejected"][
      i % 4
    ] as Claim["status"],
    incidentDate: `2025-08-${String((i % 28) + 1).padStart(2, "0")}`,
    documents: Math.floor(Math.random() * 6) + 1,
  }));

  // Filtering
  const filteredClaims = claims.filter((claim) => {
    const statusMatch =
      filters.status.length === 0 || filters.status.includes(claim.status);
    const projectMatch =
      filters.project === "" ||
      claim.project.toLowerCase().includes(filters.project.toLowerCase());
    const dateMatch =
      filters.date === "" || claim.incidentDate === filters.date;
    return statusMatch && projectMatch && dateMatch;
  });

  // Sorting
  const sortedClaims = [...filteredClaims].sort((a, b) => {
    if (sortKey === "date") {
      return (
        new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
      );
    }
    if (sortKey === "status") return a.status.localeCompare(b.status);
    if (sortKey === "project") return a.project.localeCompare(b.project);
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedClaims.length / itemsPerPage);
  const paginatedClaims = sortedClaims.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Status counts
  const statusCounts = ["Submitted", "In Review", "Approved", "Rejected"].map(
    (status) => ({
      label: status,
      count: claims.filter((c) => c.status === status).length,
    })
  );

  // Status toggle
  const toggleStatusFilter = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setCurrentPage(1);
  };

  // Filter panel
  const FilterPanel = () => (
    <div className="p-4">
      <h2 className="font-semibold text-gray-800 mb-4">Filters</h2>
      <div className="space-y-3">
        {/* Status Filter */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Status</p>
          {["Submitted", "In Review", "Approved", "Rejected"].map((status) => (
            <label key={status} className="flex items-center space-x-2 mb-1">
              <input
                type="checkbox"
                checked={filters.status.includes(status)}
                onChange={() => toggleStatusFilter(status)}
              />
              <span className="text-sm">{status}</span>
            </label>
          ))}
        </div>

        {/* Project Filter */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Project</p>
          <input
            type="text"
            placeholder="Search project"
            value={filters.project}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, project: e.target.value }))
            }
            className="w-full border rounded-lg px-2 py-1 text-sm"
          />
        </div>

        {/* Date Filter */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">
            Incident Date
          </p>
          <input
            type="date"
            value={filters.date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date: e.target.value }))
            }
            className="w-full border rounded-lg px-2 py-1 text-sm"
          />
        </div>
      </div>
    </div>
  );

  const navItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "claims", label: "Claims", icon: FileText },
    { id: "documents", label: "Documents", icon: Folder },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0a2045] text-white p-4 flex items-center justify-between shadow">
        <div className="flex items-center space-x-3">
          {/* Hamburger menu for mobile */}
          <button className="md:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Contractor Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Mobile filter button */}
          <button
            className="md:hidden flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg text-sm"
            onClick={() => setMobileFilterOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button>
            <Bell className="h-5 w-5" />
          </button>
          <button>
            <Settings className="h-5 w-5" />
          </button>
          <button>
            <User className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/login"); // Redirect to login page
            }}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs (desktop only) */}
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

      <div className="flex">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block w-64 bg-white border-r">
          <FilterPanel />
        </aside>

        {/* Main Dashboard */}
        <main className="flex-1 p-6">
          {/* Overview Cards */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {statusCounts.map((card) => {
                  const icon =
                    card.label === "Approved" ? (
                      <CheckCircle />
                    ) : card.label === "In Review" ? (
                      <AlertCircle />
                    ) : card.label === "Submitted" ? (
                      <FileText />
                    ) : (
                      <X />
                    );

                  const color =
                    card.label === "Approved"
                      ? "bg-green-100 text-green-600"
                      : card.label === "In Review"
                      ? "bg-yellow-100 text-yellow-600"
                      : card.label === "Submitted"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-red-100 text-red-600";

                  return (
                    <motion.div
                      key={card.label}
                      whileHover={{ scale: 1.03 }}
                      className={`rounded-2xl shadow p-6 flex items-center space-x-3 ${color}`}
                    >
                      <div>{icon}</div>
                      <div>
                        <p className="text-sm">{card.label}</p>
                        <h3 className="text-2xl font-bold">{card.count}</h3>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Latest Claims */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Latest Claims</h2>
                <div className="divide-y">
                  {claims
                    .sort(
                      (a, b) =>
                        new Date(b.incidentDate).getTime() -
                        new Date(a.incidentDate).getTime()
                    )
                    .slice(0, 3)
                    .map((claim) => (
                      <div
                        key={claim.id}
                        className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-lg px-2"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {claim.project}
                          </p>
                          <p className="text-xs text-gray-500">
                            {claim.incidentDate} • {claim.status}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          ID: {claim.id}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Latest Notifications */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Latest Notifications
                </h2>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-500" />
                    Claim C-1012 was approved yesterday.
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Claim C-1015 is under review.
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    New document uploaded for Claim C-1017.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Claims */}
          {activeTab === "claims" && (
            <>
              {/* Sorting */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Claims</h2>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="date">Sort by Date</option>
                  <option value="status">Sort by Status</option>
                  <option value="project">Sort by Project</option>
                </select>
              </div>

              {/* Claims Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedClaims.map((claim) => (
                  <motion.div
                    key={claim.id}
                    whileHover={{ scale: 1.02 }}
                    layout
                    className="bg-white p-4 rounded-xl shadow hover:shadow-md transition cursor-pointer"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {claim.project}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          claim.status === "Approved"
                            ? "bg-green-100 text-green-600"
                            : claim.status === "In Review"
                            ? "bg-yellow-100 text-yellow-600"
                            : claim.status === "Submitted"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Claim ID: {claim.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Incident: {claim.incidentDate}
                    </p>
                    <p className="text-sm text-gray-500">
                      Documents: {claim.documents}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center mt-6 space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border rounded-lg ${
                      currentPage === i + 1
                        ? "bg-[#0a2045] text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 w-72 h-full bg-white shadow-lg z-50"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-gray-800">Navigation</h2>
              <button onClick={() => setMobileNavOpen(false)}>
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="flex flex-col p-4 space-y-4">
              {navItems.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileNavOpen(false);
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

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg z-50"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-gray-800">Filters</h2>
              <button onClick={() => setMobileFilterOpen(false)}>
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <FilterPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-Out Claim Details */}
      <AnimatePresence>
        {selectedClaim && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 w-96 h-full bg-white shadow-lg p-6 z-50 overflow-y-auto"
          >
            <button
              className="text-gray-500 hover:text-gray-800 mb-4"
              onClick={() => setSelectedClaim(null)}
            >
              Close
            </button>
            <h3 className="text-xl font-bold mb-2">{selectedClaim.project}</h3>
            <p className="mb-1 text-sm">Claim ID: {selectedClaim.id}</p>
            <p className="mb-1 text-sm">Status: {selectedClaim.status}</p>
            <p className="mb-1 text-sm">
              Incident Date: {selectedClaim.incidentDate}
            </p>
            <p className="mb-4 text-sm">
              Documents Uploaded: {selectedClaim.documents}
            </p>

            {/* Tabs in Claim Details */}
            <div className="mb-4 border-b flex space-x-4">
              {["overview", "documents", "activity"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailsTab(tab)}
                  className={`capitalize pb-2 ${
                    detailsTab === tab
                      ? "border-b-2 border-[#0a2045] text-[#0a2045]"
                      : "text-gray-500"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {detailsTab === "overview" && (
              <p className="text-sm text-gray-600">
                General overview of this claim’s details...
              </p>
            )}
            {detailsTab === "documents" && (
              <p className="text-sm text-gray-600">
                Attached documents list will go here.
              </p>
            )}
            {detailsTab === "activity" && (
              <p className="text-sm text-gray-600">
                Activity log for claim actions...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractorDashboard;
