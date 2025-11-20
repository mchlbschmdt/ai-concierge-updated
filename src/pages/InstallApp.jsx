import React from 'react';
import Layout from '@/components/Layout';
import { Download, Smartphone, Wifi, Bell, Zap } from 'lucide-react';

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Install Hostly AI
          </h1>
          <p className="text-muted-foreground">
            Get the full app experience on your device
          </p>
        </div>

        {isInstalled ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-green-600 font-medium mb-2">
              ✓ App Already Installed
            </div>
            <p className="text-sm text-green-700">
              You're all set! The app is installed and ready to use.
            </p>
          </div>
        ) : (
          <>
            {deferredPrompt && (
              <div className="mb-8">
                <button
                  onClick={handleInstall}
                  className="w-full bg-primary text-primary-foreground px-6 py-4 rounded-lg hover:bg-primary/90 transition font-medium text-lg shadow-lg"
                >
                  <Download className="inline mr-2" size={20} />
                  Install Now
                </button>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <FeatureCard
                icon={<Smartphone />}
                title="Native App Feel"
                description="Full-screen experience without browser UI"
              />
              <FeatureCard
                icon={<Wifi />}
                title="Works Offline"
                description="Access your data even without internet"
              />
              <FeatureCard
                icon={<Zap />}
                title="Faster Loading"
                description="Instant startup with cached resources"
              />
              <FeatureCard
                icon={<Bell />}
                title="Push Notifications"
                description="Stay updated with real-time alerts"
              />
            </div>

            <div className="bg-muted rounded-lg p-6">
              <h2 className="font-semibold text-foreground mb-4">
                Manual Installation Instructions
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">On iPhone/iPad (Safari)</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Tap the Share button (square with arrow up)</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" in the top right corner</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">On Android (Chrome)</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Tap the menu (three dots)</li>
                    <li>Tap "Install app" or "Add to Home screen"</li>
                    <li>Confirm by tapping "Install"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">On Desktop (Chrome/Edge)</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Look for the install icon in the address bar</li>
                    <li>Click "Install" in the popup</li>
                    <li>The app will open in its own window</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
