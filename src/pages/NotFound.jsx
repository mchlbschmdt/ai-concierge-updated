import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-slate-200">404</h1>
          <div className="text-6xl mb-4">🏨</div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Page Not Found</h2>
          <p className="text-slate-600 mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            <Home size={20} />
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
        
        <div className="mt-8 text-sm text-slate-500">
          <p>Common pages:</p>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <Link to="/properties" className="text-blue-600 hover:underline">Properties</Link>
            <Link to="/guests" className="text-blue-600 hover:underline">Guests</Link>
            <Link to="/messages" className="text-blue-600 hover:underline">Messages</Link>
            <Link to="/analytics" className="text-blue-600 hover:underline">Analytics</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
