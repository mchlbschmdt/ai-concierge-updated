
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { roleService } from "@/services/roleService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      } else {
        setSession(session);
        setCurrentUser(session?.user || null);
        
        // Fetch user roles if logged in
        if (session?.user) {
          try {
            const roles = await roleService.getUserRoles(session.user.id);
            setUserRoles(roles);
            setIsSuperAdmin(roles.includes('super_admin'));
          } catch (err) {
            console.error("Error fetching roles:", err);
          }
        }
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session);
        setSession(session);
        setCurrentUser(session?.user || null);
        
        if (session?.user) {
          try {
            const roles = await roleService.getUserRoles(session.user.id);
            setUserRoles(roles);
            setIsSuperAdmin(roles.includes('super_admin'));
          } catch (err) {
            console.error("Error fetching roles:", err);
          }
        } else {
          setUserRoles([]);
          setIsSuperAdmin(false);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      return { error };
    }
    setUserRoles([]);
    setIsSuperAdmin(false);
    return { error: null };
  };

  const value = {
    currentUser,
    session,
    loading,
    userRoles,
    isSuperAdmin,
    hasRole: (role) => userRoles.includes(role),
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
