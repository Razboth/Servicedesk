'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  isOutdated: boolean;
  warnings: string[];
}

function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  
  let name = 'Unknown';
  let version = 'Unknown';
  let major = 0;
  
  // Detect browser name and version
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) {
      version = match[1];
      major = parseInt(match[1]);
    }
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) {
      version = match[1];
      major = parseInt(match[1]);
    }
  } else if (userAgent.indexOf('Firefox') > -1) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) {
      version = match[1];
      major = parseInt(match[1]);
    }
  } else if (userAgent.indexOf('Edg') > -1) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) {
      version = match[1];
      major = parseInt(match[1]);
    }
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
    name = 'Internet Explorer';
    version = '11 or older';
    major = 11;
  }
  
  // Check if browser is supported
  const minVersions: Record<string, number> = {
    'Chrome': 90,
    'Firefox': 88,
    'Safari': 14,
    'Edge': 90
  };
  
  const warnings: string[] = [];
  let isSupported = true;
  let isOutdated = false;
  
  if (name === 'Internet Explorer') {
    isSupported = false;
    warnings.push('Internet Explorer is not supported. Please use a modern browser.');
  } else if (name === 'Unknown') {
    warnings.push('Unable to detect your browser. Some features may not work correctly.');
  } else {
    const minVersion = minVersions[name];
    if (minVersion && major < minVersion) {
      isOutdated = true;
      isSupported = false;
      warnings.push(`${name} version ${version} is outdated. Please update to version ${minVersion} or later.`);
    }
  }
  
  // Check for other compatibility issues
  if (!window.localStorage) {
    warnings.push('Local storage is not available. Some features may not work.');
  }
  
  if (!navigator.cookieEnabled) {
    warnings.push('Cookies are disabled. You may experience login issues.');
  }
  
  return {
    name,
    version,
    isSupported,
    isOutdated,
    warnings
  };
}

export function BrowserCompatibilityWarning() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false);

  useEffect(() => {
    // Check if user has permanently dismissed the warning
    const dismissedUntil = localStorage.getItem('browserWarningDismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setPermanentlyDismissed(true);
        return;
      }
    }

    // Detect browser only on client side
    const info = detectBrowser();
    if (!info.isSupported || info.warnings.length > 0) {
      setBrowserInfo(info);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleDismissPermanently = () => {
    // Dismiss for 30 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 30);
    localStorage.setItem('browserWarningDismissed', dismissUntil.toISOString());
    setPermanentlyDismissed(true);
    setDismissed(true);
  };

  if (!browserInfo || dismissed || permanentlyDismissed) {
    return null;
  }

  const severity = !browserInfo.isSupported ? 'destructive' : 'warning';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-b shadow-lg">
      <Alert variant={severity as any} className="max-w-6xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Browser Compatibility Warning</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="ml-auto -mr-2 -mt-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <div>
            Detected browser: <strong>{browserInfo.name} {browserInfo.version}</strong>
          </div>
          {browserInfo.warnings.map((warning, index) => (
            <div key={index} className="text-sm">
              • {warning}
            </div>
          ))}
          {!browserInfo.isSupported && (
            <div className="mt-4 space-y-2">
              <p className="font-semibold">Recommended browsers:</p>
              <ul className="text-sm space-y-1">
                <li>• Google Chrome 90 or later</li>
                <li>• Mozilla Firefox 88 or later</li>
                <li>• Microsoft Edge 90 or later</li>
                <li>• Safari 14 or later</li>
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            {browserInfo.isOutdated && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  // Open browser download page based on detected browser
                  const urls: Record<string, string> = {
                    'Chrome': 'https://www.google.com/chrome/',
                    'Firefox': 'https://www.mozilla.org/firefox/',
                    'Edge': 'https://www.microsoft.com/edge',
                    'Safari': 'https://support.apple.com/downloads/safari'
                  };
                  const url = urls[browserInfo.name] || 'https://browsehappy.com/';
                  window.open(url, '_blank');
                }}
              >
                Update Browser
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismissPermanently}
            >
              Don't show for 30 days
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Hook to check if browser is compatible (for use in other components)
export function useBrowserCompatibility() {
  const [isCompatible, setIsCompatible] = useState(true);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);
    setIsCompatible(info.isSupported);
  }, []);

  return { isCompatible, browserInfo };
}