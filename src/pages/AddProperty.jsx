
// File: /frontend/dashboard-fixed/src/pages/AddProperty.jsx

import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AddProperty() {
  const [form, setForm] = useState({
    property_name: '',
    code: '',
    address: '',
    check_in_time: '4 PM',
    check_out_time: '10 AM',
    local_recommendations: '',
    knowledge_base: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'properties'), form);
    alert("Property added!");
    setForm({
      property_name: '',
      code: '',
      address: '',
      check_in_time: '4 PM',
      check_out_time: '10 AM',
      local_recommendations: '',
      knowledge_base: ''
    });
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add New Property</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input name="property_name" value={form.property_name} onChange={handleChange} placeholder="Property Name" required />
        <Input name="code" value={form.code} onChange={handleChange} placeholder="Unique Code (e.g. PR1234)" required />
        <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" required />
        <Input name="check_in_time" value={form.check_in_time} onChange={handleChange} placeholder="Check-in Time" />
        <Input name="check_out_time" value={form.check_out_time} onChange={handleChange} placeholder="Check-out Time" />
        <Input name="local_recommendations" value={form.local_recommendations} onChange={handleChange} placeholder="Local Recommendations" />
        <Textarea
          name="knowledge_base"
          value={form.knowledge_base}
          onChange={handleChange}
          placeholder="Knowledge Base Notes"
          className="resize-y min-h-[100px] max-h-[250px] bg-gray-50 border border-gray-300"
        />
        <Button type="submit">Add Property</Button>
      </form>
    </div>
  );
}
