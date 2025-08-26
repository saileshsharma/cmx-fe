// components/ProtectedLayout.jsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import HeaderNav from "./Header";

export default function ProtectedLayout({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        badges={{ notifications: 3 }}
        brand={{ name: "Claims MotorX", sub: "" }}
        onLogout={handleLogout}
      />
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
