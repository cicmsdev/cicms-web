"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "./claimManagerDashboard/Header";
import Navigation, { type Tab } from "./claimManagerDashboard/Navigation";
import FilterPanel from "./claimManagerDashboard/FilterPanel";
import Overview from "./claimManagerDashboard/Overview";
import Claims from "./claimManagerDashboard/Claims";
import ClaimDetails from "./claimManagerDashboard/AdminClaimDetails";
import MobileNavDrawer from "./claimManagerDashboard/MobileNavDrawer";
import MobileFilterDrawer from "./claimManagerDashboard/MobileFilterDrawer";
import AnalyticsPage from "./claimManagerDashboard/analytics";

import type { QueryClaimsParams } from "@/lib/claims";
import { UiClaim, UiFilters, toUiClaim, uiToStatus } from "@/lib/uiClaims";
import {
  getManagerDashboard,
  listManagerClaims,
} from "../../services/claims/manager/manager.api";
import MessagesTab from "../chat/MessagesTab";
import { useDmContacts } from "@/hooks/useDmContacts";
import AdminNotificationsPanel from "../notifications/AdminNotificationsPanel";
import UsersList from "./claimManagerDashboard/UsersList";
import { useAdminNotificationsPaged } from "@/hooks/useAdminNotifications";
import { useAuth } from "../../context/AuthContext";



export default function ManagerDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [messagesUnread, setMessagesUnread] = useState(0);

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
  const uiClaims: UiClaim[] = useMemo(
    () => apiClaims.map(toUiClaim),
    [apiClaims]
  );

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
        !filters.fromDate ||
        new Date(c.incidentDate) >= new Date(filters.fromDate);
      const toDateMatch =
        !filters.toDate || new Date(c.incidentDate) <= new Date(filters.toDate);
      return statusMatch && projectMatch && fromDateMatch && toDateMatch;
    });
  }, [uiClaims, showFilters, filters]);

  // Selected claim for details
  const [selectedClaim, setSelectedClaim] = useState<UiClaim | null>(null);
  // --- NEW: DM Contacts (with optional search) ---
  const [dmSearch, setDmSearch] = useState("");
  const { data: dmPeers = [], isLoading: dmLoading } = useDmContacts(
    dmSearch,
    50
  );

  // latest admin notifications (3 newest)
    const { data: latestAdminNotifs, status: latestStatus } = useAdminNotificationsPaged({
    page: 1,
    pageSize: 3,
    filters: { includeArchived: false, unreadOnly: false, sortDir: "desc" },
  });

  

  // PDF export metadata
  const exporterName =
    (typeof window !== "undefined" && localStorage.getItem("auth_name")) ||
    user?.name ||
    "";

  // Whatever your UI filters are (here: filters.fromDate/toDate)
  const rangeText =
    filters.fromDate && filters.toDate
      ? `Range: ${filters.fromDate} → ${filters.toDate}`
      : "Range: (no date filter)";

  const buildPdfMeta = () => ({
    exporterName,
    rangeText,
    extraNote: filters.project ? `Project filter: "${filters.project}"` : undefined,
    logoUrl: "/logo.png", // optional if you have it
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        onOpenNav={() => setMobileNavOpen(true)}
        onOpenFilter={showFilters ? () => setMobileFilterOpen(true) : undefined}
      />

      {/* Navigation */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        messagesCount={messagesUnread}
      />

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
                  claims={uiClaims} // unfiltered for overview
                  total={totalClaims}
                  onSelectClaim={setSelectedClaim}
                  // pass  notifications + handler to open Notifications tab
                  latestNotifications={latestAdminNotifs?.notifications ?? []}
                  latestNotificationsLoading={latestStatus === "pending"}
                  onOpenNotifications={() => setActiveTab("notifications")}
                />
              )}
              {activeTab === "claims" && (
                <Claims
                  claims={filteredClaims} // filtered for claims tab
                  onSelectClaim={setSelectedClaim}
                  onBuildPdfData={buildPdfMeta}
                />
              )}
              {activeTab === "messages" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {dmLoading && (
                      <span className="text-xs text-gray-500">
                        Loading contacts…
                      </span>
                    )}
                  </div>

                  <MessagesTab
                    claims={uiClaims}
                    dmPeers={dmPeers}
                    showSideSearch // ← enable search for claims/contacts
                    onUnreadChange={setMessagesUnread}
                  />
                </div>
              )}

              {activeTab === "notifications" && <AdminNotificationsPanel />}
              {activeTab === "analysis" && <AnalyticsPage />}
              {activeTab === "user" && <UsersList />}
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
