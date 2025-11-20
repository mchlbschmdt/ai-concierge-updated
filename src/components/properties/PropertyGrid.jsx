
import React from "react";
import PropertyGridCard from "./PropertyGridCard";

export default function PropertyGrid({ properties, onUpdate }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map(property => (
        <PropertyGridCard 
          key={property.id || property.code}
          property={property}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
