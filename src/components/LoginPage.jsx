
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/chubb-logo-png_seeklogo-470295.png"; // ✅ Chubb Logo

export default function LoginPage({ setIsAuthenticated }) { // ✅ Accept prop
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // Dummy Auth (replace with API/Keycloak/JWT)
    if (email === "admin@cmx.com" && password === "admin123") {
      localStorage.setItem("isAuthenticated", "true"); // ✅ Persist login
      setIsAuthenticated(true); // ✅ Update state
      navigate("/claims-dashboard"); // ✅ Redirect
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <img src={Logo} alt="Chubb Logo" className="mx-auto h-16 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800">Claims MotorX Portal</h2>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-100 text-red-700 p-2 rounded text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="block text-gray-700 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cmx.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold shadow-md transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
