
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
  Bot,
  FileText,
  TrendingUp,
  MessagesSquare,
  UserCog,
  Shield,
  Users as UsersIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Building2, label: 'Properties', path: '/properties' },
    { icon: Users, label: 'Guests', path: '/guests' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: TestTube, label: 'Test AI Responses', path: '/test-responses' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: BarChart3, label: 'Smart Insights', path: '/insights' },
    { icon: TrendingUp, label: 'Quality Analytics', path: '/quality-analytics' },
    { icon: Mail, label: 'Email Management', path: '/email-management' },
    { icon: FileText, label: 'Knowledge Base', path: '/knowledge-base' },
    { icon: HelpCircle, label: 'FAQ Editor', path: '/faq-editor' },
    { icon: MapPin, label: 'Travel Guide', path: '/travel-admin' },
    { icon: UserCog, label: 'Profile Settings', path: '/profile-settings' },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: UsersIcon, label: 'User Management', path: '/admin/users' },
    { icon: Building2, label: 'All Properties', path: '/admin/properties' },
    { icon: MessagesSquare, label: 'SMS Conversations', path: '/sms-conversations' },
    { icon: TestTube, label: 'System Diagnostics', path: '/admin/system-diagnostics' },
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
          
          {/* Admin Section */}
          {isSuperAdmin && (
            <>
              <div className="mt-6 mb-2 px-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </h3>
              </div>
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors duration-200 ${
                      isActive
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
