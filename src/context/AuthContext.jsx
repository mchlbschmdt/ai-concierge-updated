
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
      }
      
      setSession(session);
      setCurrentUser(session?.user || null);
      setLoading(false); // Set loading false immediately after session is confirmed
      
      // Fetch user roles asynchronously (non-blocking)
      if (session?.user) {
        const fetchRolesWithTimeout = async () => {
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
            );
            const rolesPromise = roleService.getUserRoles(session.user.id);
            
            const roles = await Promise.race([rolesPromise, timeoutPromise]);
            setUserRoles(roles);
            setIsSuperAdmin(roles.includes('super_admin'));
          } catch (err) {
            console.error("Error fetching roles:", err);
            // Set default user role on error
            setUserRoles([]);
            setIsSuperAdmin(false);
          }
        };
        
        fetchRolesWithTimeout();
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session);
        setSession(session);
        setCurrentUser(session?.user || null);
        setLoading(false); // Set loading false immediately
        
        // Fetch roles asynchronously (non-blocking)
        if (session?.user) {
          const fetchRolesWithTimeout = async () => {
            try {
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
              );
              const rolesPromise = roleService.getUserRoles(session.user.id);
              
              const roles = await Promise.race([rolesPromise, timeoutPromise]);
              setUserRoles(roles);
              setIsSuperAdmin(roles.includes('super_admin'));
            } catch (err) {
              console.error("Error fetching roles:", err);
              setUserRoles([]);
              setIsSuperAdmin(false);
            }
          };
          
          fetchRolesWithTimeout();
        } else {
          setUserRoles([]);
          setIsSuperAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        return { error };
      }
      
      // Clear all session data
      setUserRoles([]);
      setIsSuperAdmin(false);
      setSession(null);
      setCurrentUser(null);
      
      // Clear remember me preference
      localStorage.removeItem('rememberMe');
      
      return { error: null };
    } catch (err) {
      console.error("Unexpected error during sign out:", err);
      return { error: err };
    }
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
