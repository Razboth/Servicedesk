import { NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';

/**
 * Device information extracted from user agent
 */
export interface DeviceInfo {
  // Browser information
  browser: {
    name: string;
    version: string;
    major: string;
  };
  // Operating system
  os: {
    name: string;
    version: string;
  };
  // Device type
  device: {
    type: string; // mobile, tablet, desktop
    vendor?: string;
    model?: string;
  };
  // Engine information
  engine: {
    name: string;
    version: string;
  };
  // CPU architecture
  cpu: {
    architecture?: string;
  };
  // Raw user agent
  userAgent: string;
  // Compatibility flags
  compatibility: {
    isSupported: boolean;
    isOutdated: boolean;
    warnings: string[];
  };
}

/**
 * Minimum supported browser versions
 */
const MINIMUM_VERSIONS = {
  'Chrome': 90,
  'Firefox': 88,
  'Safari': 14,
  'Edge': 90,
  'Opera': 76,
  'Samsung Browser': 14,
  'Mobile Safari': 14,
  'Chrome Mobile': 90,
  'Firefox Mobile': 88,
};

/**
 * Extract device information from request
 */
export function getDeviceInfo(request: NextRequest): DeviceInfo {
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  const deviceType = result.device.type || (
    /mobile|android|iphone/i.test(userAgent) ? 'mobile' :
    /tablet|ipad/i.test(userAgent) ? 'tablet' : 'desktop'
  );

  // Check browser compatibility
  const compatibility = checkCompatibility(result);

  return {
    browser: {
      name: result.browser.name || 'Unknown',
      version: result.browser.version || 'Unknown',
      major: result.browser.major || 'Unknown'
    },
    os: {
      name: result.os.name || 'Unknown',
      version: result.os.version || 'Unknown'
    },
    device: {
      type: deviceType,
      vendor: result.device.vendor,
      model: result.device.model
    },
    engine: {
      name: result.engine.name || 'Unknown',
      version: result.engine.version || 'Unknown'
    },
    cpu: {
      architecture: result.cpu.architecture
    },
    userAgent,
    compatibility
  };
}

/**
 * Check if browser is compatible and supported
 */
function checkCompatibility(result: UAParser.IResult): {
  isSupported: boolean;
  isOutdated: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let isSupported = true;
  let isOutdated = false;

  const browserName = result.browser.name || '';
  const browserMajor = parseInt(result.browser.major || '0');

  // Check if browser is in our supported list
  const minVersion = MINIMUM_VERSIONS[browserName as keyof typeof MINIMUM_VERSIONS];
  
  if (!browserName || browserName === 'Unknown') {
    warnings.push('Unable to detect browser');
    isSupported = false;
  } else if (!minVersion) {
    warnings.push(`Browser ${browserName} may not be fully supported`);
  } else if (browserMajor < minVersion) {
    isOutdated = true;
    isSupported = false;
    warnings.push(`${browserName} version ${browserMajor} is outdated. Minimum required: ${minVersion}`);
  }

  // Check for known problematic browsers
  if (browserName === 'IE' || browserName === 'Internet Explorer') {
    isSupported = false;
    warnings.push('Internet Explorer is not supported. Please use a modern browser.');
  }

  // Check OS compatibility
  const osName = result.os.name || '';
  if (osName === 'Windows XP' || osName === 'Windows Vista') {
    warnings.push(`${osName} is outdated and may have compatibility issues`);
  }

  // Check for mobile browsers with limited support
  if (result.device.type === 'mobile') {
    if (browserName === 'Opera Mini') {
      warnings.push('Opera Mini has limited JavaScript support');
      isSupported = false;
    }
  }

  return {
    isSupported,
    isOutdated,
    warnings
  };
}

/**
 * Format device info for display
 */
export function formatDeviceInfo(info: DeviceInfo): string {
  const { browser, os, device } = info;
  
  let description = `${browser.name} ${browser.major}`;
  
  if (os.name !== 'Unknown') {
    description += ` on ${os.name}`;
    if (os.version !== 'Unknown') {
      description += ` ${os.version}`;
    }
  }
  
  if (device.type !== 'desktop') {
    description += ` (${device.type})`;
  }
  
  return description;
}

/**
 * Get simplified device category for analytics
 */
export function getDeviceCategory(info: DeviceInfo): {
  browserFamily: string;
  osFamily: string;
  deviceCategory: string;
} {
  // Group browsers into families
  const browserName = info.browser.name.toLowerCase();
  let browserFamily = 'Other';
  
  if (browserName.includes('chrome') && !browserName.includes('edge')) {
    browserFamily = 'Chrome';
  } else if (browserName.includes('firefox')) {
    browserFamily = 'Firefox';
  } else if (browserName.includes('safari') && !browserName.includes('chrome')) {
    browserFamily = 'Safari';
  } else if (browserName.includes('edge')) {
    browserFamily = 'Edge';
  } else if (browserName.includes('opera')) {
    browserFamily = 'Opera';
  }

  // Group OS into families
  const osName = info.os.name.toLowerCase();
  let osFamily = 'Other';
  
  if (osName.includes('windows')) {
    osFamily = 'Windows';
  } else if (osName.includes('mac') || osName.includes('ios')) {
    osFamily = 'Apple';
  } else if (osName.includes('android')) {
    osFamily = 'Android';
  } else if (osName.includes('linux') || osName.includes('ubuntu')) {
    osFamily = 'Linux';
  }

  // Device category
  const deviceCategory = info.device.type || 'desktop';

  return {
    browserFamily,
    osFamily,
    deviceCategory
  };
}

/**
 * Check if request is from a bot/crawler
 */
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /crawling/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /slackbot/i,
    /discord/i,
    /telegram/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Extract client capabilities from headers
 */
export function getClientCapabilities(request: NextRequest): {
  acceptsWebP: boolean;
  acceptsAvif: boolean;
  prefersDarkMode: boolean;
  prefersReducedMotion: boolean;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
} {
  const accept = request.headers.get('accept') || '';
  const secChUa = request.headers.get('sec-ch-ua-platform') || '';
  
  return {
    acceptsWebP: accept.includes('image/webp'),
    acceptsAvif: accept.includes('image/avif'),
    prefersDarkMode: request.headers.get('sec-ch-prefers-color-scheme') === 'dark',
    prefersReducedMotion: request.headers.get('sec-ch-prefers-reduced-motion') === 'reduce',
    connectionType: request.headers.get('connection') || undefined,
    deviceMemory: request.headers.get('device-memory') 
      ? parseFloat(request.headers.get('device-memory')!) 
      : undefined,
    hardwareConcurrency: request.headers.get('sec-ch-ua-mobile') 
      ? parseInt(request.headers.get('sec-ch-ua-mobile')!) 
      : undefined
  };
}