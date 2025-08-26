// src/routes/index.ts
// Single source of truth for app paths and header nav groups

export const PATHS = {
  home: "/",
  policyDashboard: "/policy-dashboard",
  dispatcherSurveyor: "/dispatcher_surveyor",

  // FNOL
  fnolDashboard: "/fnol-dashboard",
  createFnol: "/create-fnol",
  fnolInquiry: "/fnol-inquiry",

  // Claims
  claimsInquiry: "/wip-page", // replace when implemented

  // Surveyor
  surveyorLiveMap: "/wip-page", // replace when implemented
  surveyorsInquiry: "/surveyors-inquiry",

  // Assignment (replace placeholders as you build them)
  claimsAssignment: "/claims-inquiry",
  fnolAssignment: "/wip-page",
  surveyorAssignment: "/wip-page",

  // Admin
  reports: "/wip-page",
  audit: "/wip-page",
  settings: "/wip-page",

  // Notifications
  notifications: "/notifications",
} as const;

type NavItem = {
  label: string;
  to: string;
  color?: string;
  testId?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Home",
    items: [
      { label: "Home", to: PATHS.home, color: "text-blue-600", testId: "nav-dashboard" },
      { label: "Policy Dashboard", to: PATHS.policyDashboard, color: "text-blue-600", testId: "nav-policy-dashboard" }
      
    ],
  },
  {
    title: "FNOL",
    items: [
      { label: "FNOL Dashboard", to: PATHS.fnolDashboard, color: "text-amber-600", testId: "nav-fnol-dashboard" },
      { label: "Create FNOL", to: PATHS.createFnol, color: "text-green-600", testId: "nav-create-fnol" },
    ],
  },
  {
    title: "Surveyor",
    items: [
      { label: "Surveyor Dashboard", to: PATHS.dispatcherSurveyor, color: "text-purple-600", testId: "nav-dispatcher" },
      { label: "Surveyor Live Map", to: PATHS.surveyorLiveMap, color: "text-pink-600", testId: "nav-live-map" }
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Claims Management", to: PATHS.claimsInquiry, color: "text-indigo-600", testId: "nav-claims-inquiry" },
      { label: "Surveyors Management", to: PATHS.surveyorsInquiry, color: "text-indigo-600", testId: "nav-surveyors-inquiry" },
      { label: "FNOL Management", to: PATHS.fnolInquiry, color: "text-indigo-600", testId: "nav-fnol-inquiry" },
    ],
  },
  {
    title: "Assignment",
    items: [
      { label: "Claims Assignment", to: PATHS.claimsAssignment, color: "text-indigo-600", testId: "nav-claims-assign" },
      { label: "FNOL Assignment", to: PATHS.fnolAssignment, color: "text-indigo-600", testId: "nav-fnol-assign" },
      { label: "Surveyor Assignment", to: PATHS.surveyorAssignment, color: "text-indigo-600", testId: "nav-surveyor-assign" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Reports & Analytics", to: PATHS.reports, color: "text-cyan-600", testId: "nav-reports" },
      { label: "Audit Log", to: PATHS.audit, color: "text-yellow-600", testId: "nav-audit" },
      { label: "Settings", to: PATHS.settings, color: "text-gray-600", testId: "nav-settings" },
    ],
  },
];
