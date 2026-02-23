import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Building2, Users, MessageSquare, BarChart3, Mail, TestTube, HelpCircle,
  MapPin, FileText, TrendingUp, MessagesSquare, UserCog, Shield, X, Settings,
  Camera, GraduationCap, Lock, Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useEntitlementContext } from '@/context/EntitlementContext';
import StatusBadge from './StatusBadge';
import { entitlementService } from '@/services/entitlementService';

const PRODUCT_NAV = {
  ai_concierge: {
    label: 'AI Concierge',
    icon: '🤖',
    items: [
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      { icon: Mail, label: 'Email Management', path: '/email-management' },
      { icon: TestTube, label: 'Test AI', path: '/test-responses' },
      { icon: FileText, label: 'Knowledge Base', path: '/knowledge-base' },
      { icon: HelpCircle, label: 'FAQ Editor', path: '/faq-editor' },
      { icon: MapPin, label: 'Travel Guide', path: '/travel-admin' },
    ],
  },
  analytics: {
    label: 'Analytics Suite',
    icon: '📊',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: Sparkles, label: 'Smart Insights', path: '/insights' },
      { icon: TrendingUp, label: 'Quality Analytics', path: '/quality-analytics' },
    ],
  },
  snappro: {
    label: 'SnapPro',
    icon: '📸',
    items: [
      { icon: Camera, label: 'Photo Optimizer', path: '/snappro' },
    ],
  },
  academy: {
    label: 'Host Academy',
    icon: '🎓',
    items: [
      { icon: GraduationCap, label: 'Training Library', path: '/academy' },
    ],
  },
};

const adminSection = {
  label: 'Admin',
  items: [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: UserCog, label: 'User Management', path: '/admin/users' },
    { icon: Building2, label: 'All Properties', path: '/admin/properties' },
    { icon: MessagesSquare, label: 'SMS Conversations', path: '/sms-conversations' },
    { icon: TestTube, label: 'System Diagnostics', path: '/admin/system-diagnostics' },
    { icon: Shield, label: 'Entitlements', path: '/admin/entitlements' },
    { icon: MessageSquare, label: 'Announcements', path: '/admin/announcements' },
  ],
};

const Sidebar = () => {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const { isOpen, isMobile, closeSidebar } = useSidebar();
  const { hasAccess, entitlements } = useEntitlementContext();

  useEffect(() => {
    if (isMobile && isOpen) closeSidebar();
  }, [location.pathname, isMobile]);

  const renderNavItem = (item, isLocked = false) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-primary/10 text-primary border-l-2 border-primary'
            : isLocked
            ? 'text-muted-foreground/50 hover:bg-muted/50'
            : 'text-foreground/70 hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${isLocked ? 'opacity-40' : ''}`} />
        <span className={isLocked ? 'opacity-50' : ''}>{item.label}</span>
        {isLocked && <Lock className="h-3 w-3 ml-auto opacity-40" />}
      </Link>
    );
  };

  const renderProductSection = (productId) => {
    const nav = PRODUCT_NAV[productId];
    if (!nav) return null;
    const access = hasAccess(productId);
    const isLocked = !access.hasAccess;

    return (
      <div key={productId} className="mb-4">
        <div className="px-4 mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>{nav.icon}</span> {nav.label}
          </span>
          <StatusBadge status={access.status} trialInfo={access.trialInfo} compact />
        </div>
        {nav.items.map(item => renderNavItem(item, isLocked))}
      </div>
    );
  };

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
            <button onClick={closeSidebar} className="lg:hidden p-1 rounded-md hover:bg-muted transition-colors" aria-label="Close menu">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        <nav className="py-4">
          {/* Overview */}
          <div className="mb-4">
            <div className="px-4 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overview</span>
            </div>
            {renderNavItem({ icon: Home, label: 'Dashboard', path: '/' })}
          </div>

          {/* Properties - always accessible */}
          <div className="mb-4">
            <div className="px-4 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Properties</span>
            </div>
            {renderNavItem({ icon: Building2, label: 'Properties', path: '/properties' })}
            {renderNavItem({ icon: Users, label: 'Guests', path: '/guests' })}
          </div>

          {/* Product sections */}
          {renderProductSection('ai_concierge')}
          {renderProductSection('analytics')}
          {renderProductSection('snappro')}
          {renderProductSection('academy')}

          {/* Account */}
          <div className="mb-4">
            <div className="px-4 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account</span>
            </div>
            {renderNavItem({ icon: Settings, label: 'Profile Settings', path: '/profile-settings' })}
          </div>

          {/* Admin */}
          {isSuperAdmin && (
            <div className="mb-4">
              <div className="px-4 mb-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Admin</span>
              </div>
              {adminSection.items.map(item => renderNavItem(item))}
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
