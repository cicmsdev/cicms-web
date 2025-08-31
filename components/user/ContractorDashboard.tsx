"use client";

import { useState } from "react";
import Header from "../user/contractorDashbord/Header";
import Navigation from "../user/contractorDashbord/Navigation";
import FilterPanel from "../user/contractorDashbord/FilterPanel";
import Overview from "../user/contractorDashbord/Overview";
import Claims from "../user/contractorDashbord/Claims";
import ClaimDetails from "../user/contractorDashbord/ClaimDetails";
import MobileNavDrawer from "../user/contractorDashbord/MobileNavDrawer";
import MobileFilterDrawer from "../user/contractorDashbord/MobileFilterDrawer";
import { Claim, Filters } from "../../lib/claimTypes";
import { mockClaims } from "../../lib/mockClaim";

export default function ContractorDashboard() {
  const [activeTab, setActiveTab] = useState("claims");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<Filters>({
    status: [],
    project: "",
    fromDate: "",
    toDate: "",
  });

  // Selected claim for modal
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Apply filters in real-time
  const filteredClaims = mockClaims.filter((claim) => {
    const statusMatch =
      filters.status.length === 0 || filters.status.includes(claim.status);
    const projectMatch =
      filters.project === "" ||
      claim.projectName.toLowerCase().includes(filters.project.toLowerCase());
    const fromDateMatch =
      filters.fromDate === "" ||
      new Date(claim.incidentDate) >= new Date(filters.fromDate);
    const toDateMatch =
      filters.toDate === "" ||
      new Date(claim.incidentDate) <= new Date(filters.toDate);

    return statusMatch && projectMatch && fromDateMatch && toDateMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        onOpenFilter={() => setMobileFilterOpen(true)}
        onOpenNav={() => setMobileNavOpen(true)}
      />

      {/* Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex">
        {/* Desktop sidebar filters */}
        <aside className="hidden md:block w-64 bg-white border-r">
          <FilterPanel filters={filters} onFilter={setFilters} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {activeTab === "overview" && (
            <Overview
              claims={filteredClaims}
              onSelectClaim={setSelectedClaim}
            />
          )}
          {activeTab === "claims" && (
            <Claims claims={filteredClaims} onSelectClaim={setSelectedClaim} />
          )}
        </main>
      </div>

      {/* Mobile navigation drawer */}
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Mobile filter drawer */}
      <MobileFilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFilter={setFilters}
      />

      {/* Claim details modal */}
      {selectedClaim && (
        <ClaimDetails
          selectedClaim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
