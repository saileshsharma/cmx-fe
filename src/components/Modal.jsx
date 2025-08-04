
import React, { useState } from 'react';

export default function Modal() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6 text-center">
      <button onClick={() => setOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
        Open Modal
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h2 className="text-xl font-bold mb-4">Modal Title</h2>
            <p>This is a modal window example.</p>
            <button onClick={() => setOpen(false)} className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
