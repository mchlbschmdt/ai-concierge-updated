
import React from 'react';
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";

export default function EmptyProperties() {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
      <h3 className="text-lg font-medium text-gray-700">No Properties Found</h3>
      <p className="text-gray-500 max-w-md mx-auto mt-1">
        You haven't added any properties yet. Get started by adding your first property.
      </p>
      <Link
        to="/dashboard/add-property"
        className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
      >
        <Plus className="mr-2 h-4 w-4" /> Add Property
      </Link>
    </div>
  );
}
