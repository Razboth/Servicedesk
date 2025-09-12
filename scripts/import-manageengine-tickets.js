#!/usr/bin/env node

/**
 * ManageEngine ServiceDesk Plus Ticket Import Script
 * 
 * This script imports tickets from ManageEngine ServiceDesk Plus into our system
 * including tickets, comments/notes, and attachment metadata.
 * 
 * Usage:
 *   node scripts/import-manageengine-tickets.js [options]
 * 
 * Options:
 *   --api-key YOUR_API_KEY    ManageEngine API key (required)
 *   --url URL                 ManageEngine URL (default: https://127.0.0.1:8081)
 *   --batch-size N            Number of tickets per batch (default: 50)
 *   --limit N                 Maximum tickets to import (optional)
 *   --skip-existing          Skip tickets already imported (default: true)
 *   --import-comments        Import ticket comments/notes (default: true)
 *   --import-attachments     Import attachment metadata (default: true)
 *   --dry-run                Test without actually importing (default: false)
 *   --start-from N           Start from ticket index N (default: 1)
 *   --filter STATUS          Only import tickets with status (e.g., "Open", "Closed")
 *   --date-from YYYY-MM-DD   Only import tickets created after this date
 *   --date-to YYYY-MM-DD     Only import tickets created before this date
 *   --verbose                Show detailed progress (default: false)
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  apiKey: '',
  url: 'https://127.0.0.1:8081',
  batchSize: 50,
  limit: null,
  skipExisting: true,
  importComments: true,
  importAttachments: true,
  dryRun: false,
  startFrom: 1,
  filter: null,
  dateFrom: null,
  dateTo: null,
  verbose: false,
  insecure: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--api-key':
      options.apiKey = args[++i];
      break;
    case '--url':
      options.url = args[++i];
      break;
    case '--batch-size':
      options.batchSize = parseInt(args[++i]);
      break;
    case '--limit':
      options.limit = parseInt(args[++i]);
      break;
    case '--skip-existing':
      options.skipExisting = args[++i] !== 'false';
      break;
    case '--import-comments':
      options.importComments = args[++i] !== 'false';
      break;
    case '--import-attachments':
      options.importAttachments = args[++i] !== 'false';
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--start-from':
      options.startFrom = parseInt(args[++i]);
      break;
    case '--filter':
      options.filter = args[++i];
      break;
    case '--date-from':
      options.dateFrom = args[++i];
      break;
    case '--date-to':
      options.dateTo = args[++i];
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--insecure':
      options.insecure = true;
      break;
    case '--help':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
ManageEngine ServiceDesk Plus Ticket Import Script

Usage:
  node scripts/import-manageengine-tickets.js --api-key YOUR_API_KEY [options]

Options:
  --api-key YOUR_API_KEY    ManageEngine API key (required)
  --url URL                 ManageEngine URL (default: https://127.0.0.1:8081)
  --batch-size N            Number of tickets per batch (default: 50)
  --limit N                 Maximum tickets to import (optional)
  --skip-existing          Skip tickets already imported (default: true)
  --import-comments        Import ticket comments/notes (default: true)
  --import-attachments     Import attachment metadata (default: true)
  --dry-run                Test without actually importing (default: false)
  --start-from N           Start from ticket index N (default: 1)
  --filter STATUS          Only import tickets with status (e.g., "Open", "Closed")
  --date-from YYYY-MM-DD   Only import tickets created after this date
  --date-to YYYY-MM-DD     Only import tickets created before this date
  --verbose                Show detailed progress (default: false)
  --insecure               Disable SSL certificate verification (use with caution)
  --help                   Show this help message

Examples:
  # Import all tickets
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY

  # Import only open tickets with comments
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --filter Open

  # Dry run to see what would be imported
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --dry-run --limit 10

  # Import tickets created in 2025
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --date-from 2025-01-01
  
  # Import with self-signed SSL certificate (insecure)
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --insecure
  `);
}

// Validate required options
if (!options.apiKey) {
  console.error('❌ Error: API key is required');
  console.log('Use --help for usage information');
  process.exit(1);
}

// Initialize Prisma client
const prisma = new PrismaClient();

// Conditionally disable SSL verification for self-signed certificates
if (options.insecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('⚠️  SSL certificate verification disabled (--insecure flag)');
}

// Statistics tracking
const stats = {
  totalTickets: 0,
  importedTickets: 0,
  skippedTickets: 0,
  failedTickets: 0,
  totalComments: 0,
  importedComments: 0,
  totalAttachments: 0,
  startTime: new Date(),
  errors: []
};

// Status mapping from ManageEngine to our system
const STATUS_MAPPING = {
  'Open': 'OPEN',
  'Pending': 'PENDING',
  'In Progress': 'IN_PROGRESS',
  'On Hold': 'PENDING',
  'Resolved': 'RESOLVED',
  'Closed': 'CLOSED',
  'Cancelled': 'CANCELLED',
  'New': 'OPEN',
  'Assigned': 'OPEN',
  'Waiting for Customer': 'PENDING',
  'Waiting for Third Party': 'PENDING_VENDOR',
  'Completed': 'RESOLVED'
};

// Priority mapping
const PRIORITY_MAPPING = {
  'Low': 'LOW',
  'Normal': 'MEDIUM',
  'Medium': 'MEDIUM',
  'High': 'HIGH',
  'Urgent': 'CRITICAL',
  'Critical': 'EMERGENCY',
  '1': 'LOW',
  '2': 'MEDIUM',
  '3': 'HIGH',
  '4': 'CRITICAL',
  '5': 'EMERGENCY'
};

// Cache for users, branches, and services
const cache = {
  users: new Map(),
  branches: new Map(),
  services: new Map(),
  legacyService: null, // Cache for Legacy Tickets service
  defaultUserId: null,
  defaultBranchId: null,
  defaultServiceId: null
};

/**
 * Make API request to ManageEngine
 */
async function makeManageEngineRequest(endpoint, params = {}) {
  const url = new URL(`${options.url}/api/v3/${endpoint}`);
  url.searchParams.append('TECHNICIAN_KEY', options.apiKey);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return new Promise((resolve, reject) => {
    https.get(url.toString(), (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check for API errors
          const statusObj = Array.isArray(json.response_status) 
            ? json.response_status[0] 
            : json.response_status;
            
          if (statusObj && statusObj.status_code !== 2000) {
            reject(new Error(`API Error: ${statusObj.status || 'Unknown error'}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get or create user
 */
async function getOrCreateUser(meUser) {
  if (!meUser) return cache.defaultUserId;
  
  const cacheKey = meUser.id || meUser.email || meUser.name;
  if (cache.users.has(cacheKey)) {
    return cache.users.get(cacheKey);
  }

  // Try to find existing user
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: meUser.email },
        { username: meUser.email?.split('@')[0] },
        { name: meUser.name }
      ]
    }
  });

  if (!user && !options.dryRun) {
    // Create placeholder user
    user = await prisma.user.create({
      data: {
        username: `me_user_${meUser.id}`,
        email: meUser.email || `legacy_${meUser.id}@system.local`,
        name: meUser.name || 'Legacy User',
        role: 'USER',
        isActive: false,
        password: null,
        mustChangePassword: false
      }
    });
    if (options.verbose) {
      console.log(`  Created user: ${user.name}`);
    }
  }

  const userId = user?.id || cache.defaultUserId;
  cache.users.set(cacheKey, userId);
  return userId;
}

/**
 * Generate unique ticket number for imported legacy tickets
 */
async function generateTicketNumber() {
  const year = new Date().getFullYear();
  const ticketCount = await prisma.legacyTicket.count();
  const paddedNumber = String(ticketCount + 1).padStart(6, '0');
  return `LEG${year}${paddedNumber}`;
}

/**
 * Map branch based on legacy ticket requester info
 * Maps branch names like "Cabang Utama" -> branch code "001"
 * Maps "Cabang Pembantu Sam Ratulangi" -> branch code "047"
 */
function mapBranchFromLegacyData(username, email, displayName) {
  if (!username && !email && !displayName) return null;
  
  // Combine all identifiers for searching
  const identifiers = [
    username || '',
    email || '',
    displayName || ''
  ].join(' ').toLowerCase();
  
  // Comprehensive branch mapping for Bank SulutGo (All 80 active branches)
  // Format: search pattern -> branch code
  const branchMappings = {
    // KANTOR PUSAT (000)
    'kantor pusat': '000',
    'head office': '000',
    'pusat': '000',
    'cab000': '000',

    // CABANG UTAMA (001) 
    'cabang utama': '001',
    'main branch': '001',
    'utama': '001',
    'cab001': '001',

    // CABANG KOTAMOBAGU (002)
    'cabang kotamobagu': '002',
    'kotamobagu': '002',
    'cab002': '002',

    // CABANG GORONTALO (003)
    'cabang gorontalo': '003',
    'gorontalo': '003',
    'cab003': '003',

    // CABANG TAHUNA (004)
    'cabang tahuna': '004',
    'tahuna': '004',
    'cab004': '004',

    // CABANG BITUNG (005)
    'cabang bitung': '005',
    'bitung': '005',
    'cab005': '005',

    // CABANG KAWANGKOAN (006)
    'cabang kawangkoan': '006',
    'kawangkoan': '006',
    'cab006': '006',

    // CABANG LIMBOTO (007)
    'cabang limboto': '007',
    'limboto': '007',
    'cab007': '007',

    // CABANG TONDANO (008)
    'cabang tondano': '008',
    'tondano': '008',
    'cab008': '008',

    // CABANG TOMOHON (009)
    'cabang tomohon': '009',
    'tomohon': '009',
    'cab009': '009',

    // CABANG MARISA (010)
    'cabang marisa': '010',
    'marisa': '010',
    'cab010': '010',

    // CABANG CALACA (011)
    'cabang calaca': '011',
    'calaca': '011',
    'cab011': '011',

    // CABANG AMURANG (012)
    'cabang amurang': '012',
    'amurang': '012',
    'cab012': '012',

    // CABANG SIAU (013)
    'cabang siau': '013',
    'siau': '013',
    'cab013': '013',

    // CAPEM LIRUNG (014)
    'capem lirung': '014',
    'lirung': '014',
    'cab014': '014',

    // CABANG TILAMUTA (015)
    'cabang tilamuta': '015',
    'tilamuta': '015',
    'cab015': '015',

    // CABANG JAKARTA (016)
    'cabang jakarta': '016',
    'jakarta': '016',
    'cab016': '016',

    // CABANG AIRMADIDI (017)
    'cabang airmadidi': '017',
    'airmadidi': '017',
    'air madidi': '017',
    'cab017': '017',

    // CABANG SUWAWA (018)
    'cabang suwawa': '018',
    'suwawa': '018',
    'cab018': '018',

    // CABANG KWANDANG (019)
    'cabang kwandang': '019',
    'kwandang': '019',
    'cab019': '019',

    // CABANG BOROKO (020)
    'cabang boroko': '020',
    'boroko': '020',
    'cab020': '020',

    // CAPEM KELAPA GADING (021)
    'capem kelapa gading': '021',
    'kelapa gading': '021',
    'kelapa': '021',
    'gading': '021',
    'cab021': '021',

    // CABANG RATAHAN (022)
    'cabang ratahan': '022',
    'ratahan': '022',
    'cab022': '022',

    // CABANG SURABAYA (023)
    'cabang surabaya': '023',
    'surabaya': '023',
    'cab023': '023',

    // CAPEM CEMPAKA PUTIH (024)
    'capem cempaka putih': '024',
    'cempaka putih': '024',
    'cempaka': '024',
    'putih': '024',
    'cab024': '024',

    // CAPEM MANGGA DUA (025)
    'capem mangga dua': '025',
    'mangga dua': '025',
    'mangga': '025',
    'cab025': '025',

    // CABANG MALANG (026)
    'cabang malang': '026',
    'malang': '026',
    'cab026': '026',

    // CABANG TUTUYAN (027)
    'cabang tutuyan': '027',
    'tutuyan': '027',
    'cab027': '027',

    // CAPEM POPAYATO (028)
    'capem popayato': '028',
    'popayato': '028',
    'cab028': '028',

    // CAPEM PASAR SENTRAL (029)
    'capem pasar sentral': '029',
    'pasar sentral': '029',
    'pasar': '029',
    'sentral': '029',
    'cab029': '029',

    // CABANG MOLIBAGU (030)
    'cabang molibagu': '030',
    'molibagu': '030',
    'cab030': '030',

    // CABANG LOLAK (031)
    'cabang lolak': '031',
    'lolak': '031',
    'cab031': '031',

    // CAPEM TAGULANDANG (032)
    'capem tagulandang': '032',
    'tagulandang': '032',
    'cab032': '032',

    // CAPEM TUMINTING (033)
    'capem tuminting': '033',
    'tuminting': '033',
    'cab033': '033',

    // CAPEM LIKUPANG (034)
    'capem likupang': '034',
    'likupang': '034',
    'cab034': '034',

    // CAPEM PAAL DUA (035)
    'capem paal dua': '035',
    'paal dua': '035',
    'paal': '035',
    'cab035': '035',

    // CAPEM PAGUAT (036)
    'capem paguat': '036',
    'paguat': '036',
    'cab036': '036',

    // CAPEM MOTOLING (037)
    'capem motoling': '037',
    'motoling': '037',
    'cab037': '037',

    // CABANG MELONGUANE (038)
    'cabang melonguane': '038',
    'melonguane': '038',
    'cab038': '038',

    // CAPEM MANEMBO-NEMBO (039)
    'capem manembo-nembo': '039',
    'manembo-nembo': '039',
    'manembo': '039',
    'nembo': '039',
    'cab039': '039',

    // CAPEM RANDANGAN (040)
    'capem randangan': '040',
    'randangan': '040',
    'cab040': '040',

    // CAPEM TOLANGOHULA (041)
    'capem tolangohula': '041',
    'tolangohula': '041',
    'cab041': '041',

    // CAPEM BAHU (042)
    'capem bahu': '042',
    'bahu': '042',
    'cab042': '042',

    // CAPEM RANOTANA (043)
    'capem ranotana': '043',
    'ranotana': '043',
    'cab043': '043',

    // CAPEM TAMAKO (044)
    'capem tamako': '044',
    'tamako': '044',
    'cab044': '044',

    // CAPEM PAGUYAMAN (045)
    'capem paguyaman': '045',
    'paguyaman': '045',
    'cab045': '045',

    // CAPEM LANGOWAN (046)
    'capem langowan': '046',
    'langowan': '046',
    'cab046': '046',

    // CAPEM SAMRAT (047) - Sam Ratulangi
    'capem samrat': '047',
    'capem sam ratulangi': '047',
    'sam ratulangi': '047',
    'samrat': '047',
    'ratulangi': '047',
    'cab047': '047',

    // CAPEM BEO (048)
    'capem beo': '048',
    'beo': '048',
    'cab048': '048',

    // CAPEM TELAGA (049)
    'capem telaga': '049',
    'telaga': '049',
    'cab049': '049',

    // CAPEM MOPUYA (050)
    'capem mopuya': '050',
    'mopuya': '050',
    'cab050': '050',

    // CAPEM MODOINDING (051)
    'capem modoinding': '051',
    'modoinding': '051',
    'cab051': '051',

    // Departmental/Divisional codes
    'departemen administrasi': 'ALK',
    'laporan kredit': 'ALK',
    'administrasi': 'ALK',
    'alk': 'ALK',

    'unit apu': 'APU',
    'apu': 'APU',
    'ppt': 'APU',

    'corporate secretary': 'CSC',
    'secretary': 'CSC',
    'csc': 'CSC',

    'teknologi informasi': 'ITE',
    'divisi it': 'ITE',
    'it': 'ITE',
    'ite': 'ITE',

    'divisi kepatuhan': 'KEP',
    'kepatuhan': 'KEP',
    'kep': 'KEP',

    'ketahanan siber': 'KKS',
    'keamanan siber': 'KKS',
    'cyber security': 'KKS',
    'kks': 'KKS',

    'kredit komersial': 'KSB',
    'komersial': 'KSB',
    'ksb': 'KSB',

    'kredit konsumer': 'KSF',
    'konsumer': 'KSF',
    'ksf': 'KSF',

    'kantor wilayah': 'KWL',
    'wilayah': 'KWL',
    'kwl': 'KWL',

    'manajemen risiko': 'MRI',
    'risk management': 'MRI',
    'mri': 'MRI',

    'operasional': 'OL',
    'layanan': 'OL',
    'ol': 'OL',

    'pengembangan bisnis': 'PBJ',
    'bisnis': 'PBJ',
    'jaringan': 'PBJ',
    'pbj': 'PBJ',

    'unit pajak': 'PJK',
    'pajak': 'PJK',
    'pjk': 'PJK',

    'pengendalian keuangan': 'PKU',
    'keuangan': 'PKU',
    'pku': 'PKU',

    'pemasaran dana': 'PRI',
    'pemasaran': 'PRI',
    'dana': 'PRI',
    'pri': 'PRI',

    'perencanaan': 'REN',
    'evaluasi': 'REN',
    'ren': 'REN',

    'special asset': 'SAM',
    'asset management': 'SAM',
    'sam': 'SAM',

    'human capital': 'SDM',
    'human resources': 'SDM',
    'sdm': 'SDM',

    'audit internal': 'SKAI',
    'internal audit': 'SKAI',
    'skai': 'SKAI',

    'sentra layanan atm': 'SLA',
    'atm': 'SLA',
    'sla': 'SLA',

    'trisuri': 'TRI',
    'tri': 'TRI',

    'divisi umum': 'UMM',
    'umum': 'UMM',
    'umm': 'UMM'
  };
  
  // Search for branch patterns in identifiers
  for (const [pattern, branchCode] of Object.entries(branchMappings)) {
    if (identifiers.includes(pattern)) {
      return branchCode;
    }
  }
  
  // Check email patterns for branch codes
  if (email && email.includes('@')) {
    const emailLocal = email.split('@')[0].toLowerCase();
    for (const [pattern, branchCode] of Object.entries(branchMappings)) {
      if (emailLocal.includes(pattern)) {
        return branchCode;
      }
    }
  }
  
  if (options.verbose) {
    console.log(`  🔍 No branch mapping found for identifiers: ${identifiers}`);
  }
  
  return null;
}

/**
 * Get or create branch with improved mapping based on requester info
 */
async function getOrCreateBranch(meSite, requesterInfo = null) {
  let branchCode = null;
  let branchName = null;
  
  // First try to map based on requester info to get branch code
  if (requesterInfo) {
    branchCode = mapBranchFromLegacyData(
      requesterInfo.name, 
      requesterInfo.email, 
      requesterInfo.display_name
    );
    if (branchCode && options.verbose) {
      console.log(`  🌍 Mapped branch code from user info: ${branchCode}`);
    }
  }
  
  // Fall back to site-based mapping if no branch code found
  if (!branchCode && meSite) {
    // Try to extract branch code from site name
    branchCode = mapBranchFromLegacyData('', '', meSite.name);
    branchName = meSite.name;
  }
  
  // Use default if no mapping found
  if (!branchCode) return cache.defaultBranchId;
  
  // Check cache using branch code
  if (cache.branches.has(branchCode)) {
    return cache.branches.get(branchCode);
  }

  // Look for branch by code first (most reliable)
  let branch = await prisma.branch.findFirst({
    where: {
      OR: [
        { code: branchCode },
        { code: branchCode.padStart(3, '0') }, // Ensure 3-digit format
        { name: { contains: branchName || '', mode: 'insensitive' } }
      ]
    }
  });

  if (!branch && !options.dryRun) {
    // Create branch with proper code if not found
    const formattedCode = branchCode.padStart(3, '0');
    branch = await prisma.branch.create({
      data: {
        code: formattedCode,
        name: branchName || `Branch ${formattedCode}`,
        address: 'Imported from ManageEngine Legacy System',
        city: 'Sulawesi Utara',
        isActive: true
      }
    });
    if (options.verbose) {
      console.log(`  🏢 Created branch: ${branch.code} - ${branch.name}`);
    }
  }

  const branchId = branch?.id || cache.defaultBranchId;
  cache.branches.set(branchCode, branchId);
  return branchId;
}

/**
 * Get the Legacy Tickets service for all imported tickets
 */
async function getLegacyTicketsService() {
  // Check cache first
  if (cache.legacyService) {
    return cache.legacyService;
  }

  // Find the Legacy Tickets service
  let service = await prisma.service.findFirst({
    where: {
      name: 'Legacy Tickets',
      isActive: true
    }
  });

  if (!service) {
    // If not found, create it
    console.log('⚠️  Legacy Tickets service not found, creating it...');
    
    // Get or create Legacy Systems category
    let category = await prisma.serviceCategory.findFirst({
      where: { name: 'Legacy Systems' }
    });
    
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          name: 'Legacy Systems',
          description: 'Services for managing tickets imported from legacy systems',
          isActive: true
        }
      });
    }
    
    // Create the service
    service = await prisma.service.create({
      data: {
        name: 'Legacy Tickets',
        description: 'Service for tickets imported from ManageEngine and other legacy systems.',
        helpText: 'Used automatically by the import system for legacy tickets.',
        categoryId: category.id,
        isActive: true,
        requiresApproval: false,
        estimatedHours: 0,
        slaHours: 24,
        responseHours: 24,
        resolutionHours: 72,
        priority: 'MEDIUM',
        defaultTitle: 'Legacy Ticket Import',
        defaultItilCategory: 'INCIDENT',
        isConfidential: false,
        isKasdaService: false,
        businessHoursOnly: false
      }
    });
    
    console.log(`✅ Created Legacy Tickets service: ${service.id}`);
  }

  // Cache the service ID
  cache.legacyService = service.id;
  return service.id;
}

/**
 * Initialize cache with defaults
 */
async function initializeCache() {
  // Get or create default user
  let defaultUser = await prisma.user.findFirst({
    where: { username: 'legacy_system' }
  });
  
  if (!defaultUser && !options.dryRun) {
    defaultUser = await prisma.user.create({
      data: {
        username: 'legacy_system',
        email: 'legacy@system.local',
        name: 'Legacy System User',
        role: 'USER',
        isActive: false,
        password: null,
        mustChangePassword: false
      }
    });
  }
  cache.defaultUserId = defaultUser?.id;

  // Get default branch
  const defaultBranch = await prisma.branch.findFirst({
    where: { isActive: true }
  });
  cache.defaultBranchId = defaultBranch?.id;

  // Get default service
  const defaultService = await prisma.service.findFirst({
    where: { isActive: true }
  });
  cache.defaultServiceId = defaultService?.id;

  console.log('✅ Cache initialized');
}

/**
 * Import a single ticket
 */
async function importTicket(meTicket, batchId) {
  // Check if already imported
  if (options.skipExisting) {
    const existing = await prisma.legacyTicket.findFirst({
      where: {
        originalSystem: 'MANAGEENGINE',
        originalTicketId: meTicket.id
      },
      include: {
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
    
    if (existing) {
      // Check if existing ticket has comments
      if (existing._count.comments === 0 && options.importComments) {
        // Existing ticket without comments - import comments only
        if (options.verbose) {
          console.log(`  📝 Importing missing comments for existing ticket ${meTicket.id}`);
        }
        return { id: existing.id, ticketNumber: existing.ticketNumber, isExisting: true };
      } else {
        // Skip completely - already has comments or comments disabled
        stats.skippedTickets++;
        if (options.verbose) {
          const reason = existing._count.comments > 0 ? 'already has comments' : 'comments disabled';
          console.log(`  ⏭️  Skipped ticket ${meTicket.id} (already imported, ${reason})`);
        }
        return null;
      }
    }
  }

  // Map data using branch mapping instead of user creation
  const branchId = await getOrCreateBranch(meTicket.site, meTicket.requester);
  const serviceId = await getLegacyTicketsService();
  const ticketNumber = await generateTicketNumber();
  
  // Extract requester and technician names for reference
  const requesterName = meTicket.requester?.name || meTicket.requester?.display_name || 'Unknown Requester';
  const technicianName = meTicket.technician?.name || meTicket.technician?.display_name || null;

  // Parse dates
  const createdAt = new Date(parseInt(meTicket.created_time.value));
  const resolvedAt = meTicket.resolved_time ? new Date(parseInt(meTicket.resolved_time.value)) : null;
  const closedAt = meTicket.closed_time ? new Date(parseInt(meTicket.closed_time.value)) : null;

  // Build original data object
  const originalData = {
    id: meTicket.id,
    subject: meTicket.subject,
    description: meTicket.description,
    status: meTicket.status,
    priority: meTicket.priority,
    requester: meTicket.requester,
    technician: meTicket.technician,
    site: meTicket.site,
    category: meTicket.category,
    subcategory: meTicket.subcategory,
    item: meTicket.item,
    resolution: meTicket.resolution,
    udf_fields: meTicket.udf_fields,
    created_time: meTicket.created_time,
    due_by_time: meTicket.due_by_time,
    resolved_time: meTicket.resolved_time,
    closed_time: meTicket.closed_time
  };

  const legacyTicketData = {
    ticketNumber,
    title: meTicket.subject || 'No Subject',
    description: meTicket.description || 'No description provided',
    originalTicketId: meTicket.id,
    originalSystem: 'MANAGEENGINE',
    originalData,
    status: STATUS_MAPPING[meTicket.status.name] || 'OPEN',
    priority: PRIORITY_MAPPING[meTicket.priority.name] || 'MEDIUM',
    category: 'INCIDENT',
    originalCreatedAt: createdAt, // Original creation date from ManageEngine
    originalUpdatedAt: createdAt, // Use created date as updated date if no updated date
    originalResolvedAt: resolvedAt,
    originalClosedAt: closedAt,
    resolutionNotes: meTicket.resolution,
    importBatchId: batchId,
    originalRequester: requesterName,
    originalTechnician: technicianName,
    
    // Relations (only include IDs that exist in schema)
    serviceId,
    branchId
  };

  if (options.dryRun) {
    console.log(`  🔍 Would import ticket: ${meTicket.id} - ${meTicket.subject}`);
    return { id: 'dry-run-' + meTicket.id };
  }

  const createdLegacyTicket = await prisma.legacyTicket.create({
    data: legacyTicketData
  });

  stats.importedTickets++;
  if (options.verbose) {
    console.log(`  ✅ Imported legacy ticket: ${createdLegacyTicket.ticketNumber} (ME ID: ${meTicket.id})`);
  }

  return createdLegacyTicket;
}

/**
 * Import comments for a legacy ticket
 */
async function importComments(meTicketId, legacyTicketId) {
  if (!options.importComments || options.dryRun) return;

  try {
    // Use the v3 API endpoint for notes
    const inputData = {
      list_info: {
        row_count: 100,
        start_index: 1,
        sort_field: 'created_time',
        sort_order: 'asc'
      }
    };

    const response = await makeManageEngineRequest(
      `requests/${meTicketId}/notes`,
      { input_data: JSON.stringify(inputData) }
    );

    if (response.notes && response.notes.length > 0) {
      for (const note of response.notes) {
        // Extract author name from the created_by object or use display_name
        const authorName = note.created_by?.name || note.created_by?.display_name || 'Unknown User';
        const createdAt = new Date(parseInt(note.created_time?.value || Date.now()));
        const originalCreatedAt = createdAt;

        // Create the legacy ticket comment with proper fields
        await prisma.legacyTicketComment.create({
          data: {
            content: note.description || 'No content available',
            isInternal: note.is_public === false, // Convert to internal flag
            originalAuthor: authorName,
            originalData: note, // Store the entire note object for reference
            createdAt,
            originalCreatedAt,
            legacyTicketId
          }
        });

        stats.importedComments++;
      }

      if (options.verbose) {
        console.log(`    💬 Imported ${response.notes.length} comments`);
      }
    } else {
      if (options.verbose) {
        console.log(`    💬 No comments found for ticket ${meTicketId}`);
      }
    }
  } catch (error) {
    console.error(`    ⚠️  Failed to import comments for ticket ${meTicketId}: ${error.message}`);
    if (options.verbose) {
      console.error(`    Debug info: endpoint used was requests/${meTicketId}/notes`);
    }
  }
}

/**
 * Import attachment metadata for a legacy ticket
 */
async function importAttachments(meTicketId, legacyTicketId) {
  if (!options.importAttachments || options.dryRun) return;

  try {
    const response = await makeManageEngineRequest(`requests/${meTicketId}/attachments`);

    if (response.attachments && response.attachments.length > 0) {
      for (const attachment of response.attachments) {
        // Store attachment metadata in originalData
        const legacyTicket = await prisma.legacyTicket.findUnique({
          where: { id: legacyTicketId }
        });

        const originalData = legacyTicket.originalData || {};
        if (!originalData.attachments) {
          originalData.attachments = [];
        }

        originalData.attachments.push({
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          content_type: attachment.content_type,
          created_time: attachment.created_time,
          manageEngineUrl: `${options.url}/api/v3/requests/${meTicketId}/attachments/${attachment.id}/download`
        });

        await prisma.legacyTicket.update({
          where: { id: legacyTicketId },
          data: { originalData }
        });

        stats.totalAttachments++;
      }

      if (options.verbose) {
        console.log(`    📎 Found ${response.attachments.length} attachments (metadata stored)`);
      }
    }
  } catch (error) {
    console.error(`    ⚠️  Failed to get attachments: ${error.message}`);
  }
}

/**
 * Main import function
 */
async function runImport() {
  console.log('\n🚀 ManageEngine Ticket Import');
  console.log('================================');
  console.log(`URL: ${options.url}`);
  console.log(`API Key: ${options.apiKey.substring(0, 10)}...`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Skip Existing: ${options.skipExisting}`);
  console.log(`Import Comments: ${options.importComments}`);
  console.log(`Import Attachments: ${options.importAttachments}`);
  console.log(`Dry Run: ${options.dryRun}`);
  
  if (options.limit) {
    console.log(`Limit: ${options.limit} tickets`);
  }
  if (options.filter) {
    console.log(`Filter: ${options.filter}`);
  }
  if (options.dateFrom || options.dateTo) {
    console.log(`Date Range: ${options.dateFrom || 'any'} to ${options.dateTo || 'any'}`);
  }
  console.log('');

  try {
    // Initialize cache
    await initializeCache();

    // Create migration batch
    let batchId = null;
    if (!options.dryRun) {
      const batch = await prisma.migrationBatch.create({
        data: {
          source: 'MANAGEENGINE',
          status: 'IN_PROGRESS',
          metadata: {
            url: options.url,
            options: options
          }
        }
      });
      batchId = batch.id;
      console.log(`📦 Migration batch created: ${batchId}\n`);
    }

    // Build filter for API request
    const filters = {};
    if (options.filter) {
      filters.status = { name: options.filter };
    }
    if (options.dateFrom) {
      filters.created_time = { from: new Date(options.dateFrom).getTime() };
    }
    if (options.dateTo) {
      if (!filters.created_time) filters.created_time = {};
      filters.created_time.to = new Date(options.dateTo).getTime();
    }

    // Get total count - if limit is specified, use it directly to avoid excessive API calls
    let totalCount = 0;
    if (options.limit) {
      console.log(`📊 Using specified limit: ${options.limit} tickets`);
      totalCount = options.limit;
    } else {
      console.log('🔍 Discovering total ticket count (this may take a while)...');
      let countPage = 1;
      let hasMoreRows = true;
      
      // For unlimited imports, discover in smaller chunks and be more conservative
      while (hasMoreRows && countPage <= 500) { // Limit discovery to 500 pages (50000 tickets)
        const countInputData = {
          list_info: {
            row_count: 100,
            start_index: (countPage - 1) * 100 + 1,
            sort_field: 'created_time',
            sort_order: 'desc'
          }
        };
        if (Object.keys(filters).length > 0) {
          countInputData.search_fields = filters;
        }

        try {
          const countResponse = await makeManageEngineRequest('requests', {
            input_data: JSON.stringify(countInputData)
          });
          
          const pageCount = countResponse.requests ? countResponse.requests.length : 0;
          totalCount += pageCount;
          hasMoreRows = countResponse.list_info?.has_more_rows || false;
          
          if (options.verbose && countPage % 5 === 0) { // Show progress every 5 pages
            console.log(`   Page ${countPage}: ${pageCount} tickets (total so far: ${totalCount})`);
          }
          
          countPage++;
          
          // Add delay to avoid rate limiting
          if (hasMoreRows) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between pages
          }
        } catch (error) {
          if (error.message.includes('maximum access limit')) {
            console.log(`⚠️  Rate limit hit during discovery. Using current count: ${totalCount}`);
            break;
          }
          throw error;
        }
      }
      
      if (hasMoreRows && countPage > 500) {
        console.log(`⚠️  Discovery limited to first 50000 tickets. Use --limit for more control.`);
      }
    }
    
    stats.totalTickets = totalCount;
    
    console.log(`📊 Found ${totalCount} tickets to import`);
    if (options.limit) {
      console.log(`   (Limited to ${options.limit} tickets)`);
    }
    console.log('');

    // Import tickets in batches using proper pagination
    let processedCount = 0;
    let currentPage = 1;
    let importHasMoreRows = true;
    
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.importedTickets / (elapsed / 60);
      process.stdout.write(`\r⏳ Progress: ${processedCount}/${stats.totalTickets} | Imported: ${stats.importedTickets} | Skipped: ${stats.skippedTickets} | Failed: ${stats.failedTickets} | Rate: ${rate.toFixed(1)}/min`);
    }, 1000);

    while (importHasMoreRows && processedCount < stats.totalTickets) {
      // Use ManageEngine's pagination system (max 100 per request)
      const actualBatchSize = Math.min(100, options.batchSize, stats.totalTickets - processedCount);
      const startIndex = (currentPage - 1) * 100 + 1;
      
      const batchInputData = {
        list_info: {
          row_count: actualBatchSize,
          start_index: startIndex,
          sort_field: 'created_time',
          sort_order: 'desc'
        }
      };
      if (Object.keys(filters).length > 0) {
        batchInputData.search_fields = filters;
      }

      const batchResponse = await makeManageEngineRequest('requests', {
        input_data: JSON.stringify(batchInputData)
      });

      if (!batchResponse.requests || batchResponse.requests.length === 0) {
        break;
      }
      
      importHasMoreRows = batchResponse.list_info?.has_more_rows || false;

      // Process each ticket
      for (const meTicket of batchResponse.requests) {
        try {
          const createdLegacyTicket = await importTicket(meTicket, batchId);
          
          if (createdLegacyTicket && createdLegacyTicket.id !== 'dry-run-' + meTicket.id) {
            // Import comments (for both new tickets and existing tickets without comments)
            await importComments(meTicket.id, createdLegacyTicket.id);
            
            // Import attachment metadata (only for new tickets, not existing ones)
            if (!createdLegacyTicket.isExisting) {
              await importAttachments(meTicket.id, createdLegacyTicket.id);
            }
            
            // Update stats based on whether it's new or existing
            if (createdLegacyTicket.isExisting) {
              stats.commentsImported = (stats.commentsImported || 0) + 1;
            }
          }
        } catch (error) {
          stats.failedTickets++;
          stats.errors.push({
            ticketId: meTicket.id,
            error: error.message
          });
          
          if (options.verbose) {
            console.error(`\n  ❌ Failed to import ticket ${meTicket.id}: ${error.message}`);
          }
        }
        
        processedCount++;
        if (options.limit && processedCount >= options.limit) {
          break;
        }
      }

      // Update batch progress
      if (batchId && !options.dryRun) {
        await prisma.migrationBatch.update({
          where: { id: batchId },
          data: {
            totalCount: stats.totalTickets,
            importedCount: stats.importedTickets,
            errorCount: stats.failedTickets,
            errorLog: stats.errors.length > 0 ? stats.errors : undefined
          }
        });
      }

      currentPage++;
      
      // Add delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500)); // Increased to 1.5 seconds
    }

    clearInterval(progressInterval);
    console.log('\n');

    // Update batch as completed
    if (batchId && !options.dryRun) {
      await prisma.migrationBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalCount: stats.totalTickets,
          importedCount: stats.importedTickets,
          errorCount: stats.failedTickets
        }
      });
    }

    // Print summary
    const duration = (Date.now() - stats.startTime) / 1000;
    console.log('\n✅ Import Complete!');
    console.log('================================');
    console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
    console.log(`Total Tickets: ${stats.totalTickets}`);
    console.log(`New Tickets Imported: ${stats.importedTickets}`);
    console.log(`Existing Tickets with Comments Added: ${stats.commentsImported || 0}`);
    console.log(`Skipped: ${stats.skippedTickets}`);
    console.log(`Failed: ${stats.failedTickets}`);
    console.log(`Total Comments Imported: ${stats.importedComments}`);
    console.log(`Attachments Found: ${stats.totalAttachments}`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`  - Ticket ${err.ticketId}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
    }

    if (options.dryRun) {
      console.log('\n📝 This was a dry run. No data was actually imported.');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
runImport().catch(console.error);