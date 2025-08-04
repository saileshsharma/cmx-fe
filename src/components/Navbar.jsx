
import React from 'react';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between">
      <h1 className="text-xl font-bold">CMX (Claims MotorX)</h1>
      <div className="space-x-4">
        <a href="#" className="hover:underline">Home</a>
        <a href="#" className="hover:underline">Chubb</a>
        <a href="#" className="hover:underline">Contact</a>
      </div>
    </nav>
  );
}
