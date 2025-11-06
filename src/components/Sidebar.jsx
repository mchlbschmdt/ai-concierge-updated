
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Mail, 
  TestTube, 
  HelpCircle,
  MapPin,
  Bot
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Building2, label: 'Properties', path: '/properties' },
    { icon: Users, label: 'Guests', path: '/guests' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: BarChart3, label: 'Smart Insights', path: '/insights' },
    { icon: Mail, label: 'Email Management', path: '/email-management' },
    { icon: TestTube, label: 'SMS Testing', path: '/sms-testing' },
    { icon: Bot, label: 'SMS Concierge Test', path: '/sms-concierge-test' },
    { icon: HelpCircle, label: 'FAQ Editor', path: '/faq-editor' },
    { icon: MapPin, label: 'Travel Guide', path: '/travel-admin' },
  ];

  return (
    <div className="bg-white shadow-sm border-r border-gray-200 w-64 min-h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Host Assistant</h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
