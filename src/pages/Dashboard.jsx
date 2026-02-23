import React, { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import {
  Building, Users, MessageSquare, Phone, Plus, BarChart3, Bot,
  ArrowRight, Lock, Clock, AlertTriangle, Bell, Star, BookOpen,
  Camera, Image, TrendingUp, Lightbulb, Download, Play, Sparkles
} from "lucide-react";
import { useEntitlementContext } from "@/context/EntitlementContext";
import { useAuth } from "@/context/AuthContext";
import { useProperties } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";

const PRODUCT_ROUTES = {
  ai_concierge: "/properties",
  snappro: "/snappro",
  analytics: "/analytics",
  academy: "/academy",
};

const PRODUCT_VALUE_PROPS = {
  ai_concierge: "Automate guest communication with AI-powered SMS concierge.",
  snappro: "Optimize your property photos with AI enhancement tools.",
  analytics: "Track performance, satisfaction scores, and revenue insights.",
  academy: "Level up your hosting skills with expert video training.",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(user) {
  if (!user) return "";
  return (
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    ""
  );
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Product Status Card ──────────────────────────────────────────────
function ProductCard({ product, access }) {
  const { status, trialInfo } = access;
  const isActive = status === "active" || status === "admin_granted";
  const isTrial = status === "trial";
  const isLocked = status === "locked";
  const isExpired = status === "expired" || status === "cancelled";

  const borderColor = isActive
    ? "border-l-emerald-500"
    : isTrial
    ? "border-l-amber-500"
    : isExpired
    ? "border-l-red-500"
    : "border-l-slate-300";

  const bg = isLocked ? "bg-slate-50" : "bg-card";

  return (
    <div className={`${bg} border border-border rounded-xl p-5 border-l-4 ${borderColor} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{product.icon}</span>
        {isActive && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active</span>}
        {isTrial && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock className="h-2.5 w-2.5" /> Trial</span>}
        {isLocked && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Lock className="h-2.5 w-2.5" /> Locked</span>}
        {isExpired && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle className="h-2.5 w-2.5" /> Expired</span>}
      </div>

      <h3 className={`font-semibold text-sm ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>{product.name}</h3>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>

      <div className="mt-4">
        {isActive && (
          <Link to={PRODUCT_ROUTES[product.id] || "/products"} className="text-xs font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1">
            Go to {product.name} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        {isTrial && (
          <div className="space-y-1">
            <p className="text-xs text-amber-700 font-medium">
              {trialInfo?.usageLimit
                ? `${trialInfo.usageLimit - trialInfo.usageCount} uses remaining`
                : trialInfo?.daysRemaining != null
                ? `${trialInfo.daysRemaining} days remaining`
                : "Trial active"}
            </p>
            <Link to="/products" className="text-xs font-medium text-amber-600 hover:text-amber-700 inline-flex items-center gap-1">
              Upgrade <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
        {isLocked && (
          <Link to="/products" className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors">
            Unlock {product.price_monthly ? `from $${product.price_monthly}/mo` : ""} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        {isExpired && (
          <Link to="/products" className="text-xs font-medium text-red-600 hover:text-red-700 inline-flex items-center gap-1">
            Reactivate <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, linkTo }) {
  const inner = (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo}>{inner}</Link> : inner;
}

// ── Quick Action Card ────────────────────────────────────────────────
function ActionCard({ icon: Icon, title, description, to }) {
  return (
    <Link to={to} className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Go <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { hasAccess, products, isLoading: entLoading } = useEntitlementContext();
  const { properties } = useProperties();
  const [guestCount, setGuestCount] = useState(null);
  const [announcementCount, setAnnouncementCount] = useState(0);

  // Fetch guest count + announcement count
  useEffect(() => {
    async function load() {
      const [gRes, aRes] = await Promise.all([
        supabase.from("guests").select("*", { count: "exact", head: true }),
        supabase.from("announcements").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      setGuestCount(gRes.count ?? 0);
      setAnnouncementCount(aRes.count ?? 0);
    }
    load();
  }, []);

  const productCards = useMemo(
    () =>
      products
        .filter((p) => p.id !== "full_suite")
        .map((p) => ({ ...p, access: hasAccess(p.id) })),
    [products, hasAccess]
  );

  const has = useMemo(() => ({
    concierge: hasAccess("ai_concierge").hasAccess,
    snappro: hasAccess("snappro").hasAccess,
    analytics: hasAccess("analytics").hasAccess,
    academy: hasAccess("academy").hasAccess,
  }), [hasAccess]);

  const anyActive = has.concierge || has.snappro || has.analytics || has.academy;
  const allActive = has.concierge && has.snappro && has.analytics && has.academy;

  const lockedProducts = productCards.filter((p) => !p.access.hasAccess);

  // ── Empty state (no products) ──
  if (!entLoading && !anyActive) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 max-w-2xl mx-auto">
          <span className="text-6xl">👋</span>
          <h1 className="text-3xl font-bold text-foreground">Welcome to HostlyAI Platform!</h1>
          <p className="text-muted-foreground text-lg">Choose your first product to get started.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4">
            {productCards.map((p) => (
              <Link key={p.id} to="/products" className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all text-left">
                <span className="text-3xl">{p.icon}</span>
                <h3 className="font-semibold text-foreground text-sm mt-3">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                <p className="text-xs font-medium text-primary mt-3 inline-flex items-center gap-1">
                  Start Free Trial <ArrowRight className="h-3 w-3" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Normal dashboard ──
  return (
    <Layout>
      <div className="space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting()}, {getDisplayName(currentUser)} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here's your HostlyAI Platform overview</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {announcementCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                <Bell className="h-3.5 w-3.5" /> {announcementCount} new
              </span>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">{formatDate()}</span>
          </div>
        </div>

        {/* ── Section 1: Product status cards ── */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">My Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {productCards.map((p) => (
              <ProductCard key={p.id} product={p} access={p.access} />
            ))}
          </div>
        </div>

        {/* ── Section 2: Quick Stats ── */}
        {anyActive && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Quick Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {has.concierge && (
                <>
                  <StatCard icon={Building} label="Properties" value={properties.length} linkTo="/properties" />
                  <StatCard icon={MessageSquare} label="Messages" value="—" />
                  <StatCard icon={Users} label="Guests" value={guestCount ?? "—"} />
                  <StatCard icon={Phone} label="SMS Status" value="✓" />
                </>
              )}
              {has.snappro && (
                <>
                  <StatCard icon={Camera} label="Photos Processed" value="—" />
                  <StatCard icon={Image} label="This Month" value="—" />
                </>
              )}
              {has.analytics && (
                <>
                  <StatCard icon={TrendingUp} label="Avg Response Rate" value="—" />
                  <StatCard icon={Star} label="Satisfaction" value="—" />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Section 3: Quick Actions ── */}
        {anyActive && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {has.concierge && (
                <>
                  <ActionCard icon={Plus} title="Add Property" description="Register a new property" to="/add-property" />
                  <ActionCard icon={MessageSquare} title="View Messages" description="See recent guest messages" to="/messages" />
                  <ActionCard icon={Bot} title="Test AI" description="Test your AI concierge" to="/test-responses" />
                </>
              )}
              {has.snappro && (
                <>
                  <ActionCard icon={Camera} title="Optimize a Photo" description="Enhance property photos" to="/snappro" />
                  <ActionCard icon={Image} title="Photo Library" description="View your optimized photos" to="/snappro/library" />
                </>
              )}
              {has.analytics && (
                <>
                  <ActionCard icon={Lightbulb} title="View Insights" description="Smart performance insights" to="/smart-insights" />
                  <ActionCard icon={Download} title="Download Report" description="Export analytics data" to="/analytics" />
                </>
              )}
              {has.academy && (
                <>
                  <ActionCard icon={Play} title="Continue Learning" description="Pick up where you left off" to="/academy" />
                  <ActionCard icon={BookOpen} title="Browse Videos" description="Explore the video library" to="/academy" />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Section 4: Product Spotlight (upsell) ── */}
        {!allActive && lockedProducts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">You might also like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lockedProducts.slice(0, 2).map((p) => (
                <Link key={p.id} to="/products" className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all flex gap-4 items-start">
                  <span className="text-3xl flex-shrink-0">{p.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{PRODUCT_VALUE_PROPS[p.id] || p.description}</p>
                    <p className="text-xs font-medium text-primary mt-2 inline-flex items-center gap-1">
                      Start Free Trial <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 5: Recent Activity Feed ── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Link to="/messages" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">View all →</Link>
          </div>
          <div className="space-y-3">
            {[
              { emoji: "💬", text: "New guest message received", time: "2 minutes ago", to: "/messages" },
              { emoji: "👥", text: "Guest check-in confirmed", time: "1 hour ago", to: "/guests" },
              { emoji: "📱", text: "SMS automation triggered", time: "3 hours ago", to: "/messages" },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <span className="text-lg flex-shrink-0">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
