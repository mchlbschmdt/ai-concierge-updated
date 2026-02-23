import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Building2, Users, MessageSquare, BarChart3, Mail, TestTube, HelpCircle,
  MapPin, FileText, TrendingUp, MessagesSquare, UserCog, Shield, X, Settings,
  Camera, GraduationCap, Lock, Sparkles, ChevronLeft, ChevronRight, Image,
  BookOpen, CreditCard, LifeBuoy, ShoppingBag, Clock, Unlock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PRODUCT_NAV = [
  {
    productId: 'ai_concierge',
    label: 'AI Concierge',
    items: [
      { icon: Building2, label: 'Properties', path: '/properties' },
      { icon: Users, label: 'Guests', path: '/guests' },
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      { icon: Mail, label: 'Email Management', path: '/email-management' },
      { icon: FileText, label: 'Knowledge Base', path: '/knowledge-base' },
      { icon: HelpCircle, label: 'FAQ Editor', path: '/faq-editor' },
      { icon: MapPin, label: 'Travel Guide', path: '/travel-admin' },
      { icon: TestTube, label: 'Test AI Responses', path: '/test-responses' },
    ],
  },
  {
    productId: 'snappro',
    label: 'SnapPro Photos',
    items: [
      { icon: Camera, label: 'Photo Optimizer', path: '/snappro' },
      { icon: Image, label: 'My Photo Library', path: '/snappro/library' },
    ],
  },
  {
    productId: 'analytics',
    label: 'Analytics',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: Sparkles, label: 'Smart Insights', path: '/insights' },
      { icon: TrendingUp, label: 'Quality Analytics', path: '/quality-analytics' },
    ],
  },
  {
    productId: 'academy',
    label: 'Host Academy',
    items: [
      { icon: GraduationCap, label: 'Video Library', path: '/academy' },
      { icon: BookOpen, label: 'My Progress', path: '/academy/progress' },
    ],
  },
];

const ADMIN_ITEMS = [
  { icon: Shield, label: 'Admin Panel', path: '/admin' },
  { icon: Building2, label: 'All Properties', path: '/admin/properties' },
  { icon: MessagesSquare, label: 'SMS Conversations', path: '/sms-conversations' },
  { icon: TestTube, label: 'System Diagnostics', path: '/admin/system-diagnostics' },
];

const Sidebar = () => {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const { isOpen, isMobile, closeSidebar, isCollapsed, toggleCollapsed } = useSidebar();
  const { hasAccess } = useEntitlementContext();

  useEffect(() => {
    if (isMobile && isOpen) closeSidebar();
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const NavItem = ({ icon: Icon, label, path, locked = false }) => {
    const active = isActive(path);
    const content = (
      <Link
        to={path}
        className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
          active
            ? 'bg-white/10 text-sidebar-active border-l-2 border-[#2563EB]'
            : locked
            ? 'text-sidebar-foreground/40 hover:bg-white/5'
            : 'text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-active'
        }`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${locked ? 'opacity-40' : ''}`} />
        {!isCollapsed && (
          <>
            <span className={`flex-1 ${locked ? 'opacity-40' : ''}`}>{label}</span>
            {locked && <Lock className="h-3 w-3 opacity-40" />}
          </>
        )}
      </Link>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip key={path}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  const SectionHeader = ({ label, productId }) => {
    if (isCollapsed && !isMobile) {
      return <div className="mx-4 my-2 border-t border-white/10" />;
    }

    const access = productId ? hasAccess(productId) : null;
    const isLocked = access && !access.hasAccess;
    const isTrial = access?.status === 'trial';
    const isActiveAccess = access?.hasAccess && access?.status !== 'trial';

    return (
      <div className="px-4 mb-1 mt-4 first:mt-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
          {isLocked && <Lock className="h-3 w-3 text-sidebar-foreground/40" />}
          {isTrial && <Clock className="h-3 w-3 text-warning" />}
          {isActiveAccess && <span className="w-2 h-2 rounded-full bg-success inline-block" />}
          {!productId && null}
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {isTrial && <span className="text-[10px] font-medium text-warning">Trial</span>}
          {isLocked && (
            <Link to="/products" className="text-[10px] font-medium text-warning hover:text-warning/80 flex items-center gap-0.5">
              Unlock <Unlock className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div className={isCollapsed && !isMobile ? 'flex justify-center w-full' : ''}>
          <div>
            <span className="text-base font-bold text-sidebar-active tracking-tight">
              {isCollapsed && !isMobile ? 'H' : 'HostlyAI'}
            </span>
            {(!isCollapsed || isMobile) && (
              <span className="block text-[10px] text-sidebar-foreground/50 -mt-0.5">Platform</span>
            )}
          </div>
        </div>
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded-md hover:bg-white/10 transition-colors text-sidebar-foreground"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
        {isMobile && (
          <button onClick={closeSidebar} className="p-1 rounded-md hover:bg-white/10 transition-colors" aria-label="Close menu">
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        )}
      </div>

      <nav className="py-2 flex-1 overflow-y-auto">
        {/* Overview */}
        <SectionHeader label="Overview" />
        <NavItem icon={Home} label="Dashboard" path="/" />
        <NavItem icon={ShoppingBag} label="My Products" path="/products" />

        {/* Product sections */}
        {PRODUCT_NAV.map(section => {
          const access = hasAccess(section.productId);
          const locked = !access.hasAccess;
          return (
            <div key={section.productId}>
              <SectionHeader label={section.label} productId={section.productId} />
              {section.items.map(item => (
                <NavItem key={item.path} {...item} locked={locked} />
              ))}
            </div>
          );
        })}

        {/* Account */}
        <SectionHeader label="Account" />
        <NavItem icon={Settings} label="Profile Settings" path="/profile-settings" />
        <NavItem icon={CreditCard} label="Billing" path="/billing" />
        <NavItem icon={LifeBuoy} label="Support" path="/support" />

        {/* Admin */}
        {isSuperAdmin && (
          <>
            <SectionHeader label="Admin" />
            {ADMIN_ITEMS.map(item => (
              <NavItem key={item.path} {...item} />
            ))}
          </>
        )}
      </nav>
    </>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={closeSidebar}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 bg-sidebar rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out h-[85vh] flex flex-col ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <div className={`
      bg-sidebar min-h-screen
      fixed top-16 bottom-0 left-0 z-40
      transition-all duration-300 ease-in-out
      overflow-y-auto flex flex-col
      ${isCollapsed ? 'w-16' : 'w-60'}
    `}>
      {sidebarContent}
    </div>
  );
};

export default Sidebar;
