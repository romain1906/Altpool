import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Leaderboard from "./pages/Leaderboard";
import Players from "./pages/Players";
import MyClubs from "./pages/MyClubs";
import Profile from "./pages/Profile";
import Reservations from "./pages/Reservations";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Admin from "./pages/Admin";
import ManagerRequests from "./pages/ManagerRequests";
import AdminUsers from "./pages/AdminUsers";

function Private({ element, adminOnly, managerOnly }) {
  return (
    <ProtectedRoute adminOnly={adminOnly} managerOnly={managerOnly}>
      <Layout>{element}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/leaderboard" element={<Private element={<Leaderboard />} />} />
      <Route path="/players" element={<Private element={<Players />} />} />
      <Route path="/my-clubs" element={<Private element={<MyClubs />} />} />
      <Route path="/profile" element={<Private element={<Profile />} />} />
      <Route path="/reservations" element={<Private element={<Reservations />} />} />
      <Route path="/matches" element={<Private element={<Matches />} />} />
      <Route path="/matches/:id" element={<Private element={<MatchDetail />} />} />
      <Route path="/tournaments" element={<Private element={<Tournaments />} />} />
      <Route path="/tournaments/:id" element={<Private element={<TournamentDetail />} />} />
      <Route path="/manager/requests" element={<Private element={<ManagerRequests />} managerOnly />} />
      <Route path="/admin" element={<Private element={<Admin />} adminOnly />} />
      <Route path="/admin/users" element={<Private element={<AdminUsers />} adminOnly />} />
      <Route path="*" element={<Navigate to="/leaderboard" replace />} />
    </Routes>
  );
}
