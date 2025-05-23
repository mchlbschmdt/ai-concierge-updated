
import React from "react";

export default function PropertyEmptyState({ isSearchResults }) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">
        {isSearchResults 
          ? "No properties match your search criteria." 
          : "No properties found. Add your first property to get started."}
      </p>
    </div>
  );
}
