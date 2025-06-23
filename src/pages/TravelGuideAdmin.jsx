import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function TravelGuideAdmin() {
  const [locations, setLocations] = useState([]);
  const [curatedLinks, setCuratedLinks] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [newLink, setNewLink] = useState({
    category: '',
    title: '',
    description: '',
    url: '',
    weight: 1
  });
  const [newLocation, setNewLocation] = useState({
    city: '',
    state: '',
    zip: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
    fetchCuratedLinks();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('city');
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive"
      });
    }
  };

  const fetchCuratedLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('curated_links')
        .select(`
          *,
          locations (city, state)
        `)
        .order('weight', { ascending: false });
      
      if (error) throw error;
      setCuratedLinks(data || []);
    } catch (error) {
      console.error('Error fetching curated links:', error);
      toast({
        title: "Error",
        description: "Failed to load curated links",
        variant: "destructive"
      });
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('locations')
        .insert([newLocation]);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Location added successfully"
      });
      
      setNewLocation({ city: '', state: '', zip: '' });
      fetchLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: "Error",
        description: "Failed to add location",
        variant: "destructive"
      });
    }
  };

  const handleAddCuratedLink = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      toast({
        title: "Error",
        description: "Please select a location first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('curated_links')
        .insert([{
          ...newLink,
          location_id: selectedLocation
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Curated link added successfully"
      });
      
      setNewLink({
        category: '',
        title: '',
        description: '',
        url: '',
        weight: 1
      });
      fetchCuratedLinks();
    } catch (error) {
      console.error('Error adding curated link:', error);
      toast({
        title: "Error",
        description: "Failed to add curated link",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      const { error } = await supabase
        .from('curated_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Link deleted successfully"
      });
      
      fetchCuratedLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Travel Guide Admin</h1>
      
      {/* Add Location */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Location</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddLocation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="City"
                value={newLocation.city}
                onChange={(e) => setNewLocation({...newLocation, city: e.target.value})}
                required
              />
              <Input
                placeholder="State (e.g., GA)"
                value={newLocation.state}
                onChange={(e) => setNewLocation({...newLocation, state: e.target.value.toUpperCase()})}
                maxLength={2}
                required
              />
              <Input
                placeholder="ZIP Code"
                value={newLocation.zip}
                onChange={(e) => setNewLocation({...newLocation, zip: e.target.value})}
              />
            </div>
            <Button type="submit">Add Location</Button>
          </form>
        </CardContent>
      </Card>

      {/* Add Curated Link */}
      <Card>
        <CardHeader>
          <CardTitle>Add Curated Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCuratedLink} className="space-y-4">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.city}, {location.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={newLink.category} onValueChange={(value) => setNewLink({...newLink, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dining">Dining</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="culture">Culture</SelectItem>
                  <SelectItem value="nightlife">Nightlife</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="family">Family-Friendly</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Weight (1-10)"
                type="number"
                min="1"
                max="10"
                value={newLink.weight}
                onChange={(e) => setNewLink({...newLink, weight: parseInt(e.target.value)})}
              />
            </div>

            <Input
              placeholder="Title"
              value={newLink.title}
              onChange={(e) => setNewLink({...newLink, title: e.target.value})}
              required
            />

            <Textarea
              placeholder="Description"
              value={newLink.description}
              onChange={(e) => setNewLink({...newLink, description: e.target.value})}
              rows={3}
            />

            <Input
              placeholder="URL (optional)"
              value={newLink.url}
              onChange={(e) => setNewLink({...newLink, url: e.target.value})}
            />

            <Button type="submit">Add Recommendation</Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Curated Links */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {curatedLinks.map((link) => (
              <div key={link.id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{link.title}</h3>
                    <p className="text-sm text-gray-600">
                      {link.locations?.city}, {link.locations?.state} • {link.category} • Weight: {link.weight}
                    </p>
                    {link.description && <p className="text-sm mt-2">{link.description}</p>}
                    {link.url && (
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm">
                        {link.url}
                      </a>
                    )}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
