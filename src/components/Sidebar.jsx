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
  FileText,
  TrendingUp,
  MessagesSquare,
  UserCog,
  Shield,
  Users as UsersIcon,
  X,
  Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';

const navSections = [
  {
    label: 'Overview',
    items: [
      { icon: Home, label: 'Dashboard', path: '/' },
    ]
  },
  {
    label: 'Properties',
    items: [
      { icon: Building2, label: 'Properties', path: '/properties' },
      { icon: Users, label: 'Guests', path: '/guests' },
    ]
  },
  {
    label: 'Communication',
    items: [
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      { icon: Mail, label: 'Email Management', path: '/email-management' },
    ]
  },
  {
    label: 'AI & Testing',
    items: [
      { icon: TestTube, label: 'Test AI Responses', path: '/test-responses' },
    ]
  },
  {
    label: 'Analytics',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: BarChart3, label: 'Smart Insights', path: '/insights' },
      { icon: TrendingUp, label: 'Quality Analytics', path: '/quality-analytics' },
    ]
  },
  {
    label: 'Content',
    items: [
      { icon: FileText, label: 'Knowledge Base', path: '/knowledge-base' },
      { icon: HelpCircle, label: 'FAQ Editor', path: '/faq-editor' },
      { icon: MapPin, label: 'Travel Guide', path: '/travel-admin' },
    ]
  },
  {
    label: 'Account',
    items: [
      { icon: Settings, label: 'Profile Settings', path: '/profile-settings' },
    ]
  },
];

const adminSection = {
  label: 'Admin',
  items: [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: UsersIcon, label: 'User Management', path: '/admin/users' },
    { icon: Building2, label: 'All Properties', path: '/admin/properties' },
    { icon: MessagesSquare, label: 'SMS Conversations', path: '/sms-conversations' },
    { icon: TestTube, label: 'System Diagnostics', path: '/admin/system-diagnostics' },
  ]
};

const Sidebar = () => {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const { isOpen, isMobile, closeSidebar } = useSidebar();

  useEffect(() => {
    if (isMobile && isOpen) {
      closeSidebar();
    }
  }, [location.pathname, isMobile]);

  const renderSection = (section) => (
    <div key={section.label} className="mb-4">
      <div className="px-4 mb-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {section.label}
        </span>
      </div>
      {section.items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-md text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      <div className={`
        bg-card border-r border-border w-60 min-h-screen
        fixed top-16 bottom-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-base font-bold text-foreground tracking-tight">Hostly.ai</span>
          {isMobile && (
            <button
              onClick={closeSidebar}
              className="lg:hidden p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      
        <nav className="py-4">
          {navSections.map(renderSection)}
          {isSuperAdmin && renderSection(adminSection)}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
