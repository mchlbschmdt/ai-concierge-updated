
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GoogleAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract the authorization code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    // Send message to opener window with auth result
    if (window.opener) {
      window.opener.postMessage({
        type: 'google-auth',
        code,
        error
      }, window.location.origin);
      
      window.close();
    } else {
      // If opened directly (not in popup), redirect back to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Authenticating with Google...</h2>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}
