"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "./claimManagerDashboard/Header";
import Navigation, { type Tab } from "./claimManagerDashboard/Navigation";
import FilterPanel from "./claimManagerDashboard/FilterPanel";
import Overview from "./claimManagerDashboard/Overview";
import Claims from "./claimManagerDashboard/Claims";
import ClaimDetails from "./claimManagerDashboard/ClaimDetails";
import MobileNavDrawer from "./claimManagerDashboard/MobileNavDrawer";
import MobileFilterDrawer from "./claimManagerDashboard/MobileFilterDrawer";

import type { QueryClaimsParams } from "@/lib/claims";
import { UiClaim, UiFilters, toUiClaim, uiToStatus } from "@/lib/uiClaims";
import { getManagerDashboard, listManagerClaims } from "../../services/claims/manager/manager.api";

/* simple placeholders so tabs work now */
function DocumentsPlaceholder() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-2">Documents</h2>
      <p className="text-sm text-gray-600">Coming soon.</p>
    </div>
  );
}
function NotificationsPlaceholder() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-2">Notifications</h2>
      <p className="text-sm text-gray-600">Coming soon.</p>
    </div>
  );
}

export default function ManagerDashboard()  {
  const [activeTab, setActiveTab] = useState<Tab>("claims");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const showFilters = activeTab === "claims";

  // UI filters (Claims tab only)
  const [filters, setFilters] = useState<UiFilters>({
    status: [],
    project: "",
    fromDate: "",
    toDate: "",
  });

  // Build backend params (only when on Claims tab)
  const params: QueryClaimsParams = useMemo(() => {
    if (!showFilters) return { page: 1, pageSize: 100 };

    const statuses = filters.status.map((s) => uiToStatus[s]);
    const statusCSV = statuses.length ? statuses.join(",") : undefined;

    return {
      status: statusCSV,
      search: filters.project || undefined,
      submittedFrom: filters.fromDate || undefined,
      submittedTo: filters.toDate || undefined,
      page: 1,
      pageSize: 100,
    };
  }, [showFilters, filters]);

  // Claims list
  const {
    data: claimsPage,
    isLoading: claimsLoading,
    isError: claimsError,
    error: claimsErrObj,
    refetch: refetchClaims,
  } = useQuery({
    queryKey: ["ManagerClaims", params],
    queryFn: () => listManagerClaims(params),
    staleTime: 30_000,
  });

  // Dashboard summary/recent
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["ManagerDashboard"],
    queryFn: () => getManagerDashboard(),
    staleTime: 60_000,
  });

  // Transform API -> UI
  const apiClaims = claimsPage?.data ?? [];
  const uiClaims: UiClaim[] = useMemo(() => apiClaims.map(toUiClaim), [apiClaims]);

  const totalClaims = dashboard?.summary?.totalClaims ?? uiClaims.length;

  // Client filtering (Claims tab only)
  const filteredClaims: UiClaim[] = useMemo(() => {
    if (!showFilters) return uiClaims;
    return uiClaims.filter((c) => {
      const statusMatch =
        filters.status.length === 0 || filters.status.includes(c.status);
      const projectMatch =
        filters.project === "" ||
        c.projectName.toLowerCase().includes(filters.project.toLowerCase());
      const fromDateMatch =
        !filters.fromDate || new Date(c.incidentDate) >= new Date(filters.fromDate);
      const toDateMatch =
        !filters.toDate || new Date(c.incidentDate) <= new Date(filters.toDate);
      return statusMatch && projectMatch && fromDateMatch && toDateMatch;
    });
  }, [uiClaims, showFilters, filters]);

  // Selected claim for details
  const [selectedClaim, setSelectedClaim] = useState<UiClaim | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        onOpenNav={() => setMobileNavOpen(true)}
        onOpenFilter={showFilters ? () => setMobileFilterOpen(true) : undefined}
      />

      {/* Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex">
        {/* Desktop filters — only on Claims tab */}
        {showFilters && (
          <aside className="hidden md:block w-64 bg-white border-r">
            <FilterPanel filters={filters} onFilter={setFilters} />
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 p-6">
          {(claimsLoading || dashLoading) && (
            <div className="text-sm text-gray-500">Loading…</div>
          )}
          {claimsError && (
            <div className="text-sm text-red-600">
              {(claimsErrObj as Error)?.message || "Failed to load claims"}
              <button
                onClick={() => refetchClaims()}
                className="ml-3 px-2 py-1 text-xs rounded border"
              >
                Retry
              </button>
            </div>
          )}

          {!claimsLoading && !claimsError && (
            <>
              {activeTab === "overview" && (
                <Overview
                  claims={uiClaims}         // unfiltered for overview
                  total={totalClaims}
                  onSelectClaim={setSelectedClaim}
                />
              )}
              {activeTab === "claims" && (
                <Claims
                  claims={filteredClaims}   // filtered for claims tab
                  onSelectClaim={setSelectedClaim}
                />
              )}
              {activeTab === "documents" && <DocumentsPlaceholder />}
              {activeTab === "notifications" && <NotificationsPlaceholder />}
            </>
          )}
        </main>
      </div>

      {/* Mobile navigation */}
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Mobile filters — only render on Claims tab */}
      {showFilters && (
        <MobileFilterDrawer
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          filters={filters}
          onFilter={setFilters}
        />
      )}

      {/* Claim details drawer */}
      {selectedClaim && (
        <ClaimDetails
          selectedClaim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
