// src/pages/FnolNoticePage.jsx
import React from "react";
import { useSubscription } from "@apollo/client";
import { FNOL_ASSIGNMENT_NOTICE } from "../../graphql/subscriptions";


// --- Toast helper ---
const pushToast = (text) => {
  window.dispatchEvent(
    new CustomEvent("app:notice", { detail: { text, kind: "success" } })
  );
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(text);
    } catch (_) {}
  }
};

/**
 * Minimal page/component that listens for FNOL → surveyor assignment.
 * Pass the fnolRef of the FNOL you just created.
 */
export default function FnolNoticePage({ fnolReferenceNo }) {
  useSubscription(FNOL_ASSIGNMENT_NOTICE, {
    variables: { fnolReferenceNo },
    onData: ({ data }) => {
      const notice = data?.data?.fnolAssignmentNotice;
      if (notice) {
        pushToast(notice.message || "FNOL has been sent to surveyor");
      }
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">FNOL Assignment Notice</h1>
      <p className="text-gray-600">
        Waiting for assignment updates for FNOL{" "}
        <span className="font-mono">{fnolReferenceNo}</span>…
      </p>
    </div>
  );
}
