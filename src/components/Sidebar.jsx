// ProtectedLayout.jsx (example)
import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import HeaderNav from "./Header";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState({ notifications: 3 });

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        badges={badges}
        brand={{ name: "Claims MotorX", sub: "Claims Console" }}
        onLogout={handleLogout}
      />
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
