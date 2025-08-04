import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white shadow mt-auto p-4 text-center text-gray-500 text-sm">
      © {new Date().getFullYear()} Chubb CMX Portal. All rights reserved.
    </footer>
  );
}
