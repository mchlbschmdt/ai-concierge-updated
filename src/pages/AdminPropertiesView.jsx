import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/context/ToastContext';
import { Building2, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPropertiesView() {
  const { showToast } = useToast();
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Fetch all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Create users map
      const usersMap = {};
      profilesData.forEach(profile => {
        usersMap[profile.id] = profile;
      });

      setProperties(propertiesData || []);
      setUsers(usersMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOwner = selectedOwner === 'all' || property.user_id === selectedOwner;
    
    return matchesSearch && matchesOwner;
  });

  const uniqueOwners = [...new Set(properties.map(p => p.user_id))].filter(Boolean);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading properties...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="h-8 w-8 text-red-600" />
            All Properties (Admin View)
          </h1>
          <p className="text-gray-600 mt-2">View and manage all properties across all users</p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Owners</option>
            {uniqueOwners.map(userId => (
              <option key={userId} value={userId}>
                {users[userId]?.email || 'Unknown User'}
              </option>
            ))}
          </select>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {property.property_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{property.address}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{users[property.user_id]?.email || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-500">
                    Code: {property.code}
                  </span>
                  <Link
                    to={`/property/${property.id}`}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No properties found</p>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          Showing {filteredProperties.length} of {properties.length} properties
        </div>
      </div>
    </Layout>
  );
}
