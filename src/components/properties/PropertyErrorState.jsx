
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyErrorState({ error }) {
  return (
    <div className="flex justify-center items-center h-64 flex-col">
      <div className="flex items-center justify-center mb-4 text-red-500">
        <AlertCircle className="mr-2" />
        <span className="font-medium">Error:</span>
      </div>
      <div className="text-red-500 mb-4 text-center max-w-md">{error}</div>
      <Button onClick={() => window.location.reload()} variant="outline">
        Try Again
      </Button>
      <div className="mt-4 text-sm text-gray-500 text-center max-w-md">
        If this error persists, try clearing your browser cache or using a different browser.
      </div>
    </div>
  );
}
