
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GmailAuthContext = createContext();

export function GmailAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check for existing Gmail authentication in Supabase
  useEffect(() => {
    const checkGmailAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          // Check if user has Gmail connection
          const { data: connections } = await supabase
            .from("service_connections")
            .select("*")
            .eq("user_id", sessionData.session.user.id)
            .eq("service_type", "gmail")
            .eq("is_active", true)
            .single();
            
          if (connections) {
            setIsAuthenticated(true);
            setUserEmail(connections.connection_details.email);
          }
        }
      } catch (error) {
        console.error("Error checking Gmail auth:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkGmailAuth();
  }, []);
  
  // Function to sign out from Gmail connection
  const signOut = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        // Deactivate Gmail connection
        await supabase
          .from("service_connections")
          .update({ is_active: false })
          .eq("user_id", sessionData.session.user.id)
          .eq("service_type", "gmail");
      }
    } catch (error) {
      console.error("Error signing out from Gmail:", error);
    }
    
    setIsAuthenticated(false);
    setUserEmail(null);
  };
  
  // Function to update auth state after successful authentication
  const updateAuthState = async (email) => {
    setIsAuthenticated(true);
    setUserEmail(email);
  };
  
  return (
    <GmailAuthContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      loading,
      signOut,
      updateAuthState
    }}>
      {children}
    </GmailAuthContext.Provider>
  );
}

export function useGmailAuth() {
  return useContext(GmailAuthContext);
}
