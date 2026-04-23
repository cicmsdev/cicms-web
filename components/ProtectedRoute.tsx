"use client";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  ownerAccess?: boolean;  // New prop to check for owner access
  ownerId?: string;      // The ID of the resource owner
  redirectUnauthenticated?: string;
  redirectUnauthorized?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  ownerAccess = false,
  ownerId,
  redirectUnauthenticated = "/login",
  redirectUnauthorized = "/dashboard",
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthorized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push(redirectUnauthenticated);
      return;
    }

    // Check if user is authorized by role OR is the owner (if ownerAccess is enabled)
    const authorizedByRole = isAuthorized(allowedRoles);
    const isOwner = ownerAccess && ownerId && user.sub === ownerId;
    
    if (!authorizedByRole && !isOwner) {
      router.push(redirectUnauthorized);
    }
  }, [user, isLoading, allowedRoles, router, isAuthorized, ownerAccess, ownerId, redirectUnauthenticated, redirectUnauthorized]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}