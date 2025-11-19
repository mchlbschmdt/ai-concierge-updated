import React, { useState } from 'react';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export const FirstPropertyStep = ({ formData, updateFormData, onNext, onSkip }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState({
    propertyName: formData.propertyName || '',
    address: formData.propertyAddress || '',
    code: formData.propertyCode || `PROP-${Date.now()}`,
    checkInTime: formData.checkInTime || '15:00',
    checkOutTime: formData.checkOutTime || '11:00'
  });

  const handleNext = async () => {
    if (!propertyData.propertyName.trim() || !propertyData.address.trim()) {
      showToast('Please fill in property name and address', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .insert({
          user_id: currentUser.id,
          property_name: propertyData.propertyName,
          address: propertyData.address,
          code: propertyData.code,
          check_in_time: propertyData.checkInTime,
          check_out_time: propertyData.checkOutTime
        });

      if (error) throw error;

      updateFormData(propertyData);
      showToast('Property added successfully!', 'success');
      onNext();
    } catch (error) {
      console.error('Error adding property:', error);
      showToast('Failed to add property', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Home className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Add Your First Property</h2>
        <p className="text-muted-foreground">
          Let's add your first property. You can add more properties later from the dashboard.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Property Name *
          </label>
          <Input
            type="text"
            value={propertyData.propertyName}
            onChange={(e) =>
              setPropertyData({ ...propertyData, propertyName: e.target.value })
            }
            placeholder="e.g., Beach House Villa"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Address *
          </label>
          <Input
            type="text"
            value={propertyData.address}
            onChange={(e) =>
              setPropertyData({ ...propertyData, address: e.target.value })
            }
            placeholder="123 Main Street, City, State"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Property Code
          </label>
          <Input
            type="text"
            value={propertyData.code}
            onChange={(e) =>
              setPropertyData({ ...propertyData, code: e.target.value })
            }
            placeholder="Unique property identifier"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Check-in Time
            </label>
            <Input
              type="time"
              value={propertyData.checkInTime}
              onChange={(e) =>
                setPropertyData({ ...propertyData, checkInTime: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Check-out Time
            </label>
            <Input
              type="time"
              value={propertyData.checkOutTime}
              onChange={(e) =>
                setPropertyData({ ...propertyData, checkOutTime: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onSkip}>
          Skip for Now
        </Button>
        <Button
          onClick={handleNext}
          disabled={loading || !propertyData.propertyName.trim() || !propertyData.address.trim()}
          className="min-w-32"
        >
          {loading ? 'Adding...' : 'Add Property'}
        </Button>
      </div>
    </div>
  );
};
