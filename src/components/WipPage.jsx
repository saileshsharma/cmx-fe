import React from "react";
import { useNavigate } from "react-router-dom";

export default function WorkInProgress() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50 via-white to-violet-50">
     

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-violet-100 p-8 relative overflow-hidden">
          {/* Animated stripes background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="h-full w-[200%] -skew-x-12 animate-[slide_6s_linear_infinite] bg-[repeating-linear-gradient(90deg,theme(colors.violet.300)_0px,theme(colors.violet.300)_24px,theme(colors.violet.100)_24px,theme(colors.violet.100)_48px)]" />
          </div>

          {/* Header Section */}
          <div className="relative flex flex-col items-center text-center">
            <div className="text-6xl mb-4 animate-bounce">🚧</div>
            <h2 className="text-3xl font-bold text-violet-700 mb-2">Work in Progress</h2>
            <p className="text-gray-600 max-w-md">
              This module is under construction. We’re wiring the backend and polishing the UI.
              Please check back later.
            </p>
          </div>

          {/* Skeleton preview */}
          <div className="relative mt-8 space-y-4">
            <div className="h-4 w-2/3 bg-violet-100 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-violet-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-violet-100 rounded animate-pulse" />
          </div>

          {/* Buttons */}
          <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 active:scale-95 transition"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-50 active:scale-95 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
