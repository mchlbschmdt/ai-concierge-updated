
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import SmsTestingDashboard from './pages/SmsTestingDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  Property Manager
                </Link>
                <Link 
                  to="/sms-testing" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  SMS Testing
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Property Management System
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Welcome to your property management dashboard
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                    🔧 SMS Integration Issue Detected
                  </h2>
                  <p className="text-yellow-700 mb-4">
                    Your OpenPhone API key needs to be updated to restore SMS functionality.
                  </p>
                  <Link 
                    to="/sms-testing"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Fix SMS Integration →
                  </Link>
                </div>
              </div>
            } />
            <Route path="/sms-testing" element={<SmsTestingDashboard />} />
          </Routes>
        </main>

        <Toaster />
      </div>
    </Router>
  );
}

export default App;
