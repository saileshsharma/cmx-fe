import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaFileAlt, FaPlusCircle, FaCar, FaCreditCard, FaUserTie } from "react-icons/fa";

export default function Sidebar() {
  const location = useLocation();

  // Active link detection
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-gray-100 text-gray-900 flex flex-col shadow-md border-r border-gray-300">
      {/* Logo / App Name */}
 

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
            isActive("/") 
              ? "bg-chubb-blue text-white shadow-md font-semibold"
              : "hover:bg-gray-200 text-gray-800"
          }`}
        >
          <FaTachometerAlt /> Dashboard
        </Link>

        <Link
          to="/policy-lookup"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
            isActive("/policy-lookup")
              ? "bg-chubb-blue text-white shadow-md font-semibold"
              : "hover:bg-gray-200 text-gray-800"
          }`}
        >
          <FaFileAlt /> Policy Inquiry
        </Link>

        <Link
          to="/create-claim"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
            isActive("/create-claim")
              ? "bg-chubb-blue text-white shadow-md font-semibold"
              : "hover:bg-gray-200 text-gray-800"
          }`}
        >
          <FaPlusCircle /> FNOL
        </Link>

        <Link
          to="/dispatch-surveyor"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
            isActive("/surveyorAssignment")
              ? "bg-chubb-blue text-white shadow-md font-semibold"
              : "hover:bg-gray-200 text-gray-800"
          }`}
        >
          <FaCar /> Dispatch Surveyor
        </Link>

        <Link
          to="/payments"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
            isActive("/payments")
              ? "bg-chubb-blue text-white shadow-md font-semibold"
              : "hover:bg-gray-200 text-gray-800"
          }`}
        >
          <FaCreditCard /> Payments
        </Link>

        <Link
          to="/agents"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
            isActive("/agents")
              ? "bg-chubb-blue text-white shadow-md font-semibold"
              : "hover:bg-gray-200 text-gray-800"
          }`}
        >
          <FaUserTie /> Agents
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-300 text-sm text-center text-gray-600">
        © {new Date().getFullYear()} Policy Portal
      </div>
    </aside>
  );
}
