import React, { useEffect } from 'react';
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
  Users as UsersIcon,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';

const Sidebar = () => {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const { isOpen, isMobile, closeSidebar } = useSidebar();

  // Auto-close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile && isOpen) {
      closeSidebar();
    }
  }, [location.pathname, isMobile]);

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
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div className={`
        bg-white shadow-sm border-r border-gray-200 w-64 min-h-screen
        fixed top-16 bottom-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Host Assistant</h1>
          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={closeSidebar}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
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
    </>
  );
};

export default Sidebar;
