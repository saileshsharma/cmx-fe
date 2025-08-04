
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { FiLogOut, FiBell } from "react-icons/fi";
import Logo from "../assets/chubb-logo-png_seeklogo-470295.png"; // Ensure this path is correct

export default function Header({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
    navigate("/login");
  };

  // Sample notifications (can be fetched from API later)
  const notifications = [
    { id: 1, text: "Claim #12345 updated to 'Pending Approval'", time: "2h ago" },
    { id: 2, text: "New FNOL submitted for Policy #56789", time: "5h ago" },
    { id: 3, text: "Claim #67890 closed successfully", time: "1d ago" },
  ];

  return (
    <header className="bg-gray-100 shadow-md p-4 flex justify-between items-center border-b border-gray-300 relative">
      {/* Left Section: Logo */}
      <div className="flex items-center space-x-3">
        <img src={Logo} alt="Chubb Logo" className="h-10" />
        <h1 className="text-xl font-semibold text-gray-800">Claims MotorX</h1>
      </div>

      {/* Right Section: Notifications & Profile */}
      <div className="flex items-center space-x-5 relative">
        <span className="text-gray-800 font-medium">
          Welcome, <span className="font-semibold">Admin</span>
        </span>

        {/* Notification Bell */}
        <div className="relative cursor-pointer">
          <FiBell
            className="text-2xl text-gray-600 hover:text-gray-800 transition"
            onClick={() => setShowNotifications(!showNotifications)}
          />
          {/* Notification Badge */}
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
              {notifications.length}
            </span>
          )}

          {/* Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-800">Notifications</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Close
                </button>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <li
                      key={n.id}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/claims-dashboard");
                      }}
                    >
                      <p className="text-gray-700">{n.text}</p>
                      <span className="text-xs text-gray-500">{n.time}</span>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-3 text-center text-gray-500 text-sm">
                    No new notifications
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* User Icon */}
        <FaUserCircle className="text-3xl text-gray-600 cursor-pointer hover:text-gray-800 transition" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-chubb-green hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition"
        >
          <FiLogOut className="text-lg" />
          Logout
        </button>
      </div>
    </header>
  );
}
