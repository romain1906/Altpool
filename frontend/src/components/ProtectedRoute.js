import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated, isAdmin, canManage } from "../services/auth";

export default function ProtectedRoute({ children, adminOnly = false, managerOnly = false }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/leaderboard" replace />;
  if (managerOnly && !canManage()) return <Navigate to="/leaderboard" replace />;
  return children;
}
