import React from "react";
import { Navigate } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function ProtectedLayout({ children, isAuthenticated, setIsAuthenticated }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ✅ Shared Sidebar */}
      <Sidebar />

      {/* ✅ Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* ✅ Shared Header */}
        <Header setIsAuthenticated={setIsAuthenticated} />

        {/* ✅ Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>

        {/* ✅ Shared Footer */}
        <Footer />
      </div>
    </div>
  );
}
