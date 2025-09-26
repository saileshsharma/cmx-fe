// src/router/AppRouter.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PATHS } from "@/routes"; // or "../../routes" if you didn't enable aliases

// Layouts / shared
const ProtectedLayout = lazy(() => import("@/components/ProtectedLayout"));
const HeaderNav = lazy(() => import("@/components/HeaderNav"));

// Home / Dashboards
const Home = lazy(() => import("@/components/Home/Home"));
const DispatcherSurveyor = lazy(() => import("@/components/surveyor/DispatcherSurveyor"));

// FNOL
const FnolDashboard = lazy(() => import("@/components/fnol/FnolDashboard"));
const CreateFnol = lazy(() => import("@/components/fnol/Fnol"));
const FnolInquiry = lazy(() => import("@/components/fnol/FnolInquiry"));

// Claims
const ClaimsInquiry = lazy(() => import("@/components/claim/ClaimsInquiry")); // create if not present

// Surveyor
const SurveyorLiveMap = lazy(() => import("@/components/surveyor/SurveyorLiveMap"));
const SurveyorLiveDashboard = lazy(() => import("@/components/surveyor/SurveyorLiveDashboard"));
const SurveyorsInquiry = lazy(() => import("@/components/surveyor/SurveyorsInquiry"));
const SurveyorsEdit = lazy(() => import("@/components/surveyor/edit"));
 

// Notifications / WIP / Misc
const Notifications = lazy(() => import("@/components/notification/Notifications"));
const WipPage = lazy(() => import("@/components/WipPage"));

// Optional auth public pages
const LoginPage = lazy(() => import("@/components/LoginPage"));

// 404
const NotFound = () => (
  <div className="max-w-screen-lg mx-auto px-4 py-16">
    <h1 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h1>
    <p className="text-gray-600 mb-6">
      The page you’re looking for doesn’t exist. You can go back to the dashboard.
    </p>
    <a href={PATHS.home} className="inline-block bg-chubb-blue text-white px-4 py-2 rounded-xl">
      Go to Dashboard
    </a>
  </div>
);

// Simple loading fallback matching your FNOL style
const Loading = () => (
  <div className="h-[50vh] grid place-items-center">
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 rounded-full bg-chubb-blue animate-pulse" />
      <span className="h-3 w-3 rounded-full bg-chubb-green animate-pulse [animation-delay:120ms]" />
      <span className="h-3 w-3 rounded-full bg-sky-500 animate-pulse [animation-delay:240ms]" />
      <span className="text-sm text-gray-600 ml-2">Loading…</span>
    </div>
  </div>
);

// If you need route-guard by role later, you can wrap <ProtectedLayout /> with a component
// that checks user roles and returns <Navigate to={...}/> when unauthorized.

export default function AppRouter() {
  // Example badges for the header (wire real counts from your store/API)
  const badges = { notifications: 3 };

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        {/* Global header lives outside to persist across routes */}
        <HeaderNav
          badges={badges}
          brand={{ name: "Policy Portal", sub: "Claims MotorX" }}
          onLogout={() => {
            // TODO: add your logout logic
            window.location.href = PATHS.home;
          }}
        />

        <Routes>
          {/* Public routes (e.g., login) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected group */}
          <Route
            element={
              <Suspense fallback={<Loading />}>
                <ProtectedLayout />
              </Suspense>
            }
          >
            {/* Home / Dashboards */}
            <Route index element={<Home />} />
            <Route path={PATHS.dispatcherSurveyor} element={<DispatcherSurveyor />} />

            {/* FNOL */}
            <Route path={PATHS.fnolDashboard} element={<FnolDashboard />} />
            <Route path={PATHS.createFnol} element={<CreateFnol />} />
            <Route path={PATHS.fnolInquiry} element={<FnolInquiry />} />

            {/* Claims */}
            <Route path={PATHS.claimsInquiry} element={<ClaimsInquiry />} />

            {/* Surveyor */}
            <Route path={PATHS.surveyorLiveMap} element={<SurveyorLiveMap />} />
            <Route path={PATHS.surveyorsLiveDashboard} element={<SurveyorLiveDashboard />} />
            <Route path={PATHS.surveyorsInquiry} element={<SurveyorsInquiry />} />
            <Route path={PATHS.surveyorsInquiry} element={<SurveyorsEdit />} />

            


            {/* Notifications / Admin placeholders / WIP */}
            <Route path={PATHS.notifications} element={<Notifications />} />
            <Route path="/wip-page" element={<WipPage />} />
          </Route>

          {/* Legacy or explicit redirects */}
          <Route path="/" element={<Navigate to={PATHS.home} replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
