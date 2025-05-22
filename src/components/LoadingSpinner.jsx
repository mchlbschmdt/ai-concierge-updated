
import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-primary"></div>
      <p className="mt-4 text-lg font-medium text-gray-700">Loading...</p>
      <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</p>
    </div>
  );
}
