
import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-gray-600">Loading properties...</p>
    </div>
  );
}
