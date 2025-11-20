import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Clock, 
  Command,
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
  Users as UsersIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentPages, setRecentPages] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const inputRef = useRef(null);

  // All navigation items
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/', keywords: ['home', 'main', 'overview'] },
    { icon: Building2, label: 'Properties', path: '/properties', keywords: ['property', 'house', 'rental'] },
    { icon: Users, label: 'Guests', path: '/guests', keywords: ['guest', 'visitor', 'customer'] },
    { icon: MessageSquare, label: 'Messages', path: '/messages', keywords: ['message', 'chat', 'conversation'] },
    { icon: TestTube, label: 'Test AI Responses', path: '/test-responses', keywords: ['test', 'ai', 'response'] },
    { icon: BarChart3, label: 'Analytics', path: '/analytics', keywords: ['analytics', 'stats', 'metrics'] },
    { icon: BarChart3, label: 'Smart Insights', path: '/insights', keywords: ['insights', 'smart', 'intelligence'] },
    { icon: TrendingUp, label: 'Quality Analytics', path: '/quality-analytics', keywords: ['quality', 'analytics'] },
    { icon: Mail, label: 'Email Management', path: '/email-management', keywords: ['email', 'mail', 'inbox'] },
    { icon: FileText, label: 'Knowledge Base', path: '/knowledge-base', keywords: ['knowledge', 'docs', 'documentation'] },
    { icon: HelpCircle, label: 'FAQ Editor', path: '/faq-editor', keywords: ['faq', 'questions', 'help'] },
    { icon: MapPin, label: 'Travel Guide', path: '/travel-admin', keywords: ['travel', 'guide', 'location'] },
    { icon: UserCog, label: 'Profile Settings', path: '/profile-settings', keywords: ['profile', 'settings', 'account'] },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin', keywords: ['admin', 'dashboard', 'control'] },
    { icon: UsersIcon, label: 'User Management', path: '/admin/users', keywords: ['users', 'admin', 'management'] },
    { icon: Building2, label: 'All Properties', path: '/admin/properties', keywords: ['properties', 'admin', 'all'] },
    { icon: MessagesSquare, label: 'SMS Conversations', path: '/sms-conversations', keywords: ['sms', 'conversations', 'messages'] },
    { icon: TestTube, label: 'System Diagnostics', path: '/admin/system-diagnostics', keywords: ['diagnostics', 'system', 'debug'] },
  ];

  const allItems = isSuperAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

  // Filter items based on query
  const filteredItems = query === '' 
    ? allItems 
    : allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.keywords?.some(k => k.includes(query.toLowerCase()))
      );

  // Get recent pages from localStorage
  useEffect(() => {
    if (isOpen) {
      const recent = JSON.parse(localStorage.getItem('recentPages') || '[]');
      setRecentPages(recent.slice(0, 5));
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleNavigate(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleNavigate = (item) => {
    if (!item) return;
    
    // Update recent pages
    const recent = JSON.parse(localStorage.getItem('recentPages') || '[]');
    const updated = [
      { path: item.path, label: item.label },
      ...recent.filter(p => p.path !== item.path)
    ].slice(0, 5);
    localStorage.setItem('recentPages', JSON.stringify(updated));
    
    navigate(item.path);
    onClose();
  };

  if (!isOpen) return null;

  const recentItems = recentPages
    .map(recent => allItems.find(item => item.path === recent.path))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-scale-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages..."
            className="flex-1 outline-none text-gray-900 placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query === '' && recentItems.length > 0 && (
            <div className="px-2 py-2 border-b border-gray-100">
              <div className="px-3 py-2 text-xs text-gray-500 font-medium flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              {recentItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex && query === '';
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    {isSelected && (
                      <kbd className="text-xs text-gray-500">Enter</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="px-2 py-2">
              {query !== '' && (
                <div className="px-3 py-2 text-xs text-gray-500 font-medium">
                  Results
                </div>
              )}
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const adjustedIndex = query === '' ? index + recentItems.length : index;
                const isSelected = adjustedIndex === selectedIndex;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    {isSelected && (
                      <kbd className="text-xs text-gray-500">Enter</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
