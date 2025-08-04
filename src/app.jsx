import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import client from "./apolloClient";

// ✅ Pages
import Home from "./components/Home";
import PolicyLookup from "./components/PolicyLookup";
import CreateClaim from "./components/Fnol";
import ClaimDetail from "./components/ClaimDetails";
import LoginPage from "./components/LoginPage";
import ProtectedLayout from "./components/ProtectedLayout";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Load authentication from localStorage
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(authStatus);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          {/* ✅ Public Route */}
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />

          {/* ✅ Protected Routes */}
          <Route
            path="/claims-dashboard"
            element={
              <ProtectedLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
                <Home />
              </ProtectedLayout>
            }
          />
          <Route
            path="/policy-lookup"
            element={
              <ProtectedLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
                <PolicyLookup />
              </ProtectedLayout>
            }
          />
          <Route
            path="/create-claim"
            element={
              <ProtectedLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
                <CreateClaim />
              </ProtectedLayout>
            }
          />
          <Route
            path="/claims/:claimID"
            element={
              <ProtectedLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
                <ClaimDetail />
              </ProtectedLayout>
            }
          />

          {/* ✅ Root Redirect */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/claims-dashboard" : "/login"} replace />} />

          {/* ✅ Catch-All */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}
