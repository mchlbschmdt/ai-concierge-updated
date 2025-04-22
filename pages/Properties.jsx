// src/pages/Properties.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function Properties() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/properties")
      .then(res => res.json())
      .then(data => setProperties(data));
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6 flex-1">
        <h2 className="text-2xl font-bold mb-4">Properties</h2>
        {properties.map(property => (
          <div key={property.code} className="border p-4 mb-2">
            <p><strong>Code:</strong> {property.code}</p>
            <p><strong>Address:</strong> {property.address}</p>
            <p><strong>User Assigned:</strong> {property.user_id}</p>
            <p><strong>Knowledge Base:</strong> {property.knowledgeBase}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
