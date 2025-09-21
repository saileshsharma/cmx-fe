import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import client from "./apolloClient";

// Login
import LoginPage from "./components/LoginPage.jsx";

// Auth
import ProtectedLayout from "./components/ProtectedLayout.jsx";

// Home
import Home from "./components/home/Home.jsx";
import PolicyDashboard from "./components/home/PolicyDashboard.jsx";

// Policy
import PolicyLookup from "./components/policy/PolicyLookup.jsx";

// Claim
import ClaimDetail from "./components/claim/ClaimDetails.jsx";
import ClaimDetailedView from "./components/claim/ClaimDetailedView.jsx";

// Surveyor
import DispatcherSurveyor from "./components/surveyor/DispatcherSurveyor.jsx";
import SurveyorLiveMap from "./components/surveyor/SurveyorLiveMap.jsx";
import Surveyors from "./components/surveyor/Surveyors.jsx";
import SurveyorsInquiry from "./components/surveyor/SurveyorsInquiry.jsx";
import SurveyorEdit from "./components/surveyor/SurveyorEdit.jsx";

// Notifications
import Notifications from "./components/notification/Notifications.jsx";

// FNOL
import CreateFnol from "./components/fnol/Fnol.jsx";
import RegisterFNOL from "./components/fnol/RegisterFNOL.jsx";
import FnolDashboard from "./components/fnol/FnolDashboard.jsx";
import FnolInquiry from "./components/fnol/FnolInquiry.jsx";

// NEW: unified search + details
import PolicySearch from "./components/fnol/PolicySearch.jsx";
import PolicyDetails from "./components/fnol/PolicyDetails.jsx";

// WIP
import WipPage from "./components/WipPage.jsx";

// GraphQL Test
import GraphQLTest from "./components/GraphQLTest.jsx";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

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
          {/* Public */}
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />

          {/* Protected layout (mounts once) */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <ProtectedLayout setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            {/* Default redirect */}
            <Route index element={<Navigate to="claims-dashboard" replace />} />

            {/* Child pages (ALL RELATIVE PATHS) */}
            <Route path="claims-dashboard" element={<Home />} />
            <Route path="policy-lookup" element={<PolicyLookup />} />
            <Route path="create-fnol" element={<CreateFnol />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="surveyors" element={<Surveyors />} />
            <Route path="claims/:claimID" element={<ClaimDetail />} />
            <Route path="dispatcher_surveyor" element={<DispatcherSurveyor />} />
            <Route path="register-fnol" element={<RegisterFNOL />} />
            <Route path="surveyors-inquiry" element={<SurveyorsInquiry />} />
            <Route path="fnol-inquiry" element={<FnolInquiry />} />
            <Route path="fnol-dashboard" element={<FnolDashboard />} />
            <Route path="surveyors-live-map" element={<SurveyorLiveMap />} />
            <Route path="claims-inquiry" element={<ClaimDetailedView />} />
            <Route path="wip-page" element={<WipPage />} />
            <Route path="surveyors-edit" element={<SurveyorEdit />} />
            <Route path="policy-dashboard" element={<PolicyDashboard />} />

            {/* ✅ New search & details routes (relative) */}
            <Route path="search" element={<PolicySearch />} />
            <Route path="policy/:policyNumber" element={<PolicyDetails />} />

            {/* GraphQL Test Route */}
            <Route path="graphql-test" element={<GraphQLTest />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/claims-dashboard" : "/login"} replace />} />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}
