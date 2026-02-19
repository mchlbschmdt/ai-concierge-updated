
import React, { useState, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Thermometer, Tv, ChefHat, WashingMachine, BookOpen } from "lucide-react";

// Parse existing knowledge_base text into structured sections
function parseKnowledgeBase(kb) {
  if (!kb) return { ac: '', tv: '', kitchen: '', laundry: '', general: '' };
  
  const sections = { ac: '', tv: '', kitchen: '', laundry: '', general: '' };
  const sectionMap = {
    'A/C & Climate Control': 'ac',
    'TV & Entertainment': 'tv',
    'Kitchen & Appliances': 'kitchen',
    'Washer/Dryer': 'laundry',
  };

  // Split by ## headers
  const parts = kb.split(/^## /m).filter(Boolean);
  const unmatchedParts = [];

  for (const part of parts) {
    let matched = false;
    for (const [header, key] of Object.entries(sectionMap)) {
      if (part.startsWith(header)) {
        sections[key] = part.replace(header, '').replace(/^\n+/, '').trim();
        matched = true;
        break;
      }
    }
    if (!matched) {
      unmatchedParts.push(part.trim());
    }
  }

  sections.general = unmatchedParts.join('\n\n');
  return sections;
}

// Combine structured sections back into a single knowledge_base string
function buildKnowledgeBase(sections) {
  const parts = [];
  if (sections.ac?.trim()) parts.push(`## A/C & Climate Control\n${sections.ac.trim()}`);
  if (sections.tv?.trim()) parts.push(`## TV & Entertainment\n${sections.tv.trim()}`);
  if (sections.kitchen?.trim()) parts.push(`## Kitchen & Appliances\n${sections.kitchen.trim()}`);
  if (sections.laundry?.trim()) parts.push(`## Washer/Dryer\n${sections.laundry.trim()}`);
  if (sections.general?.trim()) parts.push(sections.general.trim());
  return parts.join('\n\n');
}

export default function AdditionalInfoSection({ form, handleChange }) {
  const [kbSections, setKbSections] = useState(() => parseKnowledgeBase(form.knowledge_base));

  // Sync sections back to the form's knowledge_base field
  const handleSectionChange = (key, value) => {
    const updated = { ...kbSections, [key]: value };
    setKbSections(updated);
    const combined = buildKnowledgeBase(updated);
    handleChange({ target: { name: 'knowledge_base', value: combined } });
  };

  const kbFields = [
    {
      key: 'ac',
      label: 'A/C & Climate Control',
      icon: <Thermometer size={16} />,
      placeholder: 'Thermostat is on the hallway wall. Set to Cool mode, adjust temp with arrows. A/C auto-shuts off if sliding doors are left open too long. Space heater in bedroom closet for chilly nights.'
    },
    {
      key: 'tv',
      label: 'TV & Entertainment',
      icon: <Tv size={16} />,
      placeholder: 'Samsung Smart TV in living room. Use the black remote — press Home button for apps. Netflix and Hulu are pre-logged in. Sound bar: press power on small silver remote, volume buttons on side.'
    },
    {
      key: 'kitchen',
      label: 'Kitchen & Appliances',
      icon: <ChefHat size={16} />,
      placeholder: 'Keurig coffee maker on counter (pods in drawer below). Dishwasher: pull handle to open, pods under sink. Oven: press Bake, set temp with dial, press Start. Garbage disposal switch is on wall behind sink.'
    },
    {
      key: 'laundry',
      label: 'Washer/Dryer',
      icon: <WashingMachine size={16} />,
      placeholder: 'Stacked washer/dryer in hallway closet. Detergent pods on shelf above. Washer: turn dial to Normal, press Start. Dryer: set to Medium heat, 60 min cycle. Extra towels on top shelf.'
    },
    {
      key: 'general',
      label: 'General Property Notes',
      icon: <BookOpen size={16} />,
      placeholder: 'Beautiful oceanfront property with private beach access. Recently renovated with modern amenities. Surfboards in the garage are free to use.'
    },
  ];

  return (
    <div className="bg-purple-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle size={20} /> Additional Information
      </h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="local_recommendations" className="block text-sm font-medium mb-1">Local Recommendations</label>
          <Textarea
            id="local_recommendations"
            name="local_recommendations"
            value={form.local_recommendations}
            onChange={handleChange}
            placeholder="Nobu Malibu (5 min drive), Malibu Pier (10 min walk), Point Dume Beach (15 min drive)"
            className="resize-y min-h-[80px]"
          />
        </div>
        
        <div>
          <label htmlFor="cleaning_instructions" className="block text-sm font-medium mb-1">Cleaning Instructions</label>
          <Textarea
            id="cleaning_instructions"
            name="cleaning_instructions"
            value={form.cleaning_instructions}
            onChange={handleChange}
            placeholder="Cleaning crew comes Fridays at 10 AM. Please strip beds and start dishwasher before checkout."
            className="resize-y min-h-[80px]"
          />
        </div>
        
        <div>
          <label htmlFor="special_notes" className="block text-sm font-medium mb-1">Special Notes</label>
          <Textarea
            id="special_notes"
            name="special_notes"
            value={form.special_notes}
            onChange={handleChange}
            placeholder="Beach chairs in garage. Tide chart on refrigerator. Watch for high tide warnings."
            className="resize-y min-h-[80px]"
          />
        </div>

        {/* Structured Knowledge Base */}
        <div className="border-t border-purple-200 pt-4 mt-4">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <BookOpen size={18} /> Property Knowledge Base
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Add specific instructions for appliances and systems so the AI concierge can help guests with detailed questions.
          </p>
          <div className="space-y-3">
            {kbFields.map(({ key, label, icon, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                  {icon} {label}
                </label>
                <Textarea
                  value={kbSections[key] || ''}
                  onChange={(e) => handleSectionChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="resize-y min-h-[80px]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
