
import React from "react";
import { Link } from "react-router-dom";

export default function PropertyGrid({ properties }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map(property => (
        <Link to={`/dashboard/properties-manager#${property.id}`} key={property.id || property.code} 
          className="border p-4 bg-white shadow rounded hover:shadow-md transition">
          <h3 className="text-xl font-semibold text-primary">{property.property_name || "Unnamed Property"}</h3>
          <p className="text-gray-500 text-sm">Code: {property.code || "No Code"}</p>
          <p className="text-gray-600">{property.address || "No Address"}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {property.files?.length || 0} files
            </span>
            <span className="text-xs text-primary">View Details →</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
