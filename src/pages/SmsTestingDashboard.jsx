
import React from 'react';
import TestSmsIntegration from '../components/TestSmsIntegration';

export default function SmsTestingDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS Integration Testing</h1>
          <p className="text-gray-600">Comprehensive testing and debugging for SMS functionality</p>
        </div>
      </div>
      
      <TestSmsIntegration />
    </div>
  );
}
