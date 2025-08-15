"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var fs_1 = require("fs");
var path_1 = require("path");
var prisma = new client_1.PrismaClient();
// Function to read and parse CSV data
function parseCSV(filePath) {
    var csvContent = fs_1.default.readFileSync(filePath, 'utf-8');
    var lines = csvContent.split('\n').filter(function (line) { return line.trim(); });
    var headers = lines[0].split(';');
    return lines.slice(1).map(function (line) {
        var values = line.split(';');
        var obj = {};
        headers.forEach(function (header, index) {
            var _a;
            obj[header.trim()] = ((_a = values[index]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
        });
        return obj;
    });
}
// Function to parse SLA strings to hours
function parseSlaToHours(slaString) {
    if (!slaString || slaString === '')
        return 24;
    if (slaString.includes('Hrs')) {
        return parseInt(slaString.replace(' Hrs', '')) || 24;
    }
    else if (slaString.includes('Day')) {
        return (parseInt(slaString.replace(' Days', '').replace(' Day', '')) || 1) * 24;
    }
    else if (slaString.includes('Hk')) {
        return (parseInt(slaString.replace(' Hk', '')) || 1) * 24;
    }
    else if (slaString.includes('Mins')) {
        return Math.ceil((parseInt(slaString.replace(' Mins', '')) || 30) / 60);
    }
    return 24; // Default to 24 hours
}
// Function to map priority
function mapPriority(priority) {
    switch (priority === null || priority === void 0 ? void 0 : priority.toLowerCase()) {
        case 'low': return 'LOW';
        case 'medium': return 'MEDIUM';
        case 'high': return 'HIGH';
        case 'critical': return 'CRITICAL';
        default: return 'MEDIUM';
    }
}
// Function to map ITIL category
function mapItilCategory(category) {
    switch (category === null || category === void 0 ? void 0 : category.toLowerCase()) {
        case 'incident': return 'INCIDENT';
        case 'service request': return 'SERVICE_REQUEST';
        case 'change request': return 'CHANGE_REQUEST';
        case 'problem': return 'EVENT_REQUEST';
        default: return 'INCIDENT';
    }
}
// Function to map issue classification
function mapIssueClassification(classification) {
    switch (classification === null || classification === void 0 ? void 0 : classification.toLowerCase()) {
        case 'human error': return 'HUMAN_ERROR';
        case 'system error': return 'SYSTEM_ERROR';
        case 'process error': return 'PROCESS_GAP';
        case 'external error': return 'EXTERNAL_FACTOR';
        default: return 'SYSTEM_ERROR';
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var defaultSupportGroup, csvPath, csvData, branches, hashedPassword, users, tier1Categories, tier2Categories, tier3Categories, createdTier1, _i, tier1Categories_1, _a, key, name_1, category, createdTier2, _b, tier2Categories_1, _c, key, data, parent_1, subcategory, createdTier3, _d, tier3Categories_1, _e, key, data, parentKey, parent_2, item, legacyCategories, _f, tier1Categories_2, _g, key, name_2, legacyCategory, services, _h, csvData_1, row, tier1, tier2, tier3, title, tier3Key, tier3Category, tier1Category, legacyCategory, service, error_1, tickets, sampleTickets;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    console.log('Starting database seeding...');
                    // First, ensure support groups exist
                    console.log('Ensuring support groups exist...');
                    return [4 /*yield*/, prisma.supportGroup.findFirst({
                            where: { code: 'IT_HELPDESK' }
                        })];
                case 1:
                    defaultSupportGroup = _j.sent();
                    if (!defaultSupportGroup) {
                        console.error('Support groups not found. Please run: node prisma/migrate-support-groups.js first');
                        process.exit(1);
                    }
                    csvPath = path_1.default.join(process.cwd(), 'import1.csv');
                    csvData = parseCSV(csvPath);
                    console.log("Loaded ".concat(csvData.length, " records from CSV"));
                    // Create branches first
                    console.log('Creating branches...');
                    return [4 /*yield*/, Promise.all([
                            prisma.branch.create({
                                data: {
                                    name: 'Manado Main Branch',
                                    code: 'MND001',
                                    address: 'Jl. Sam Ratulangi No. 1',
                                    city: 'Manado',
                                    province: 'North Sulawesi',
                                    isActive: true,
                                },
                            }),
                            prisma.branch.create({
                                data: {
                                    name: 'Tomohon Branch',
                                    code: 'TMH001',
                                    address: 'Jl. Raya Tomohon No. 15',
                                    city: 'Tomohon',
                                    province: 'North Sulawesi',
                                    isActive: true,
                                },
                            }),
                            prisma.branch.create({
                                data: {
                                    name: 'Bitung Branch',
                                    code: 'BTG001',
                                    address: 'Jl. Pelabuhan Bitung No. 8',
                                    city: 'Bitung',
                                    province: 'North Sulawesi',
                                    isActive: true,
                                },
                            }),
                        ])
                        // Create demo users
                    ];
                case 2:
                    branches = _j.sent();
                    // Create demo users
                    console.log('Creating users...');
                    return [4 /*yield*/, bcryptjs_1.default.hash('password123', 10)];
                case 3:
                    hashedPassword = _j.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.user.create({
                                data: {
                                    email: 'admin@banksulutgo.co.id',
                                    name: 'Super Admin',
                                    password: hashedPassword,
                                    role: 'ADMIN',
                                    isActive: true,
                                },
                            }),
                            prisma.user.create({
                                data: {
                                    email: 'manager@banksulutgo.co.id',
                                    name: 'Branch Manager',
                                    password: hashedPassword,
                                    role: 'MANAGER',
                                    branchId: branches[0].id,
                                    isActive: true,
                                },
                            }),
                            prisma.user.create({
                                data: {
                                    email: 'tech@banksulutgo.co.id',
                                    name: 'IT Technician',
                                    password: hashedPassword,
                                    role: 'TECHNICIAN',
                                    supportGroupId: defaultSupportGroup.id, // Assign to default support group
                                    isActive: true,
                                },
                            }),
                            prisma.user.create({
                                data: {
                                    email: 'user@banksulutgo.co.id',
                                    name: 'Branch Employee',
                                    password: hashedPassword,
                                    role: 'USER',
                                    branchId: branches[0].id,
                                    isActive: true,
                                },
                            }),
                        ])
                        // Extract unique categories from CSV data
                    ];
                case 4:
                    users = _j.sent();
                    // Extract unique categories from CSV data
                    console.log('Processing 3-tier categories...');
                    tier1Categories = new Map();
                    tier2Categories = new Map();
                    tier3Categories = new Map();
                    // First pass: collect unique categories
                    csvData.forEach(function (row) {
                        var tier1 = row['Tier_1_Category'];
                        var tier2 = row['Tier_2_SubCategory'];
                        var tier3 = row['Tier_3_Service_Type'];
                        if (tier1)
                            tier1Categories.set(tier1, tier1);
                        if (tier1 && tier2) {
                            tier2Categories.set("".concat(tier1, "|").concat(tier2), {
                                name: tier2,
                                parent: tier1
                            });
                        }
                        if (tier1 && tier2 && tier3) {
                            tier3Categories.set("".concat(tier1, "|").concat(tier2, "|").concat(tier3), {
                                name: tier3,
                                parent1: tier1,
                                parent2: tier2
                            });
                        }
                    });
                    // Create Tier 1 categories
                    console.log("Creating ".concat(tier1Categories.size, " Tier 1 categories..."));
                    createdTier1 = new Map();
                    _i = 0, tier1Categories_1 = tier1Categories;
                    _j.label = 5;
                case 5:
                    if (!(_i < tier1Categories_1.length)) return [3 /*break*/, 8];
                    _a = tier1Categories_1[_i], key = _a[0], name_1 = _a[1];
                    return [4 /*yield*/, prisma.category.create({
                            data: {
                                name: name_1,
                                description: "Tier 1 category: ".concat(name_1),
                                isActive: true
                            }
                        })];
                case 6:
                    category = _j.sent();
                    createdTier1.set(name_1, category);
                    _j.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    // Create Tier 2 categories (subcategories)
                    console.log("Creating ".concat(tier2Categories.size, " Tier 2 subcategories..."));
                    createdTier2 = new Map();
                    _b = 0, tier2Categories_1 = tier2Categories;
                    _j.label = 9;
                case 9:
                    if (!(_b < tier2Categories_1.length)) return [3 /*break*/, 12];
                    _c = tier2Categories_1[_b], key = _c[0], data = _c[1];
                    parent_1 = createdTier1.get(data.parent);
                    if (!parent_1) return [3 /*break*/, 11];
                    return [4 /*yield*/, prisma.subcategory.create({
                            data: {
                                categoryId: parent_1.id,
                                name: data.name,
                                description: "Tier 2 subcategory: ".concat(data.name),
                                isActive: true
                            }
                        })];
                case 10:
                    subcategory = _j.sent();
                    createdTier2.set(key, subcategory);
                    _j.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12:
                    // Create Tier 3 categories (items)
                    console.log("Creating ".concat(tier3Categories.size, " Tier 3 items..."));
                    createdTier3 = new Map();
                    _d = 0, tier3Categories_1 = tier3Categories;
                    _j.label = 13;
                case 13:
                    if (!(_d < tier3Categories_1.length)) return [3 /*break*/, 16];
                    _e = tier3Categories_1[_d], key = _e[0], data = _e[1];
                    parentKey = "".concat(data.parent1, "|").concat(data.parent2);
                    parent_2 = createdTier2.get(parentKey);
                    if (!parent_2) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.item.create({
                            data: {
                                subcategoryId: parent_2.id,
                                name: data.name,
                                description: "Tier 3 item: ".concat(data.name),
                                isActive: true
                            }
                        })];
                case 14:
                    item = _j.sent();
                    createdTier3.set(key, item);
                    _j.label = 15;
                case 15:
                    _d++;
                    return [3 /*break*/, 13];
                case 16:
                    // Create legacy ServiceCategory entries for backward compatibility
                    console.log('Creating legacy service categories...');
                    legacyCategories = new Map();
                    _f = 0, tier1Categories_2 = tier1Categories;
                    _j.label = 17;
                case 17:
                    if (!(_f < tier1Categories_2.length)) return [3 /*break*/, 20];
                    _g = tier1Categories_2[_f], key = _g[0], name_2 = _g[1];
                    return [4 /*yield*/, prisma.serviceCategory.create({
                            data: {
                                name: name_2,
                                description: "Legacy category: ".concat(name_2),
                                level: 1,
                                isActive: true
                            }
                        })];
                case 18:
                    legacyCategory = _j.sent();
                    legacyCategories.set(name_2, legacyCategory);
                    _j.label = 19;
                case 19:
                    _f++;
                    return [3 /*break*/, 17];
                case 20:
                    // Create services based on CSV data
                    console.log("Creating ".concat(csvData.length, " services..."));
                    services = [];
                    _h = 0, csvData_1 = csvData;
                    _j.label = 21;
                case 21:
                    if (!(_h < csvData_1.length)) return [3 /*break*/, 26];
                    row = csvData_1[_h];
                    tier1 = row['Tier_1_Category'];
                    tier2 = row['Tier_2_SubCategory'];
                    tier3 = row['Tier_3_Service_Type'];
                    title = row['Title'] || "".concat(row['Original_Service_Catalog'], " - ").concat(row['Original_Service_Name']);
                    if (!(tier1 && tier2 && tier3)) return [3 /*break*/, 25];
                    tier3Key = "".concat(tier1, "|").concat(tier2, "|").concat(tier3);
                    tier3Category = createdTier3.get(tier3Key);
                    tier1Category = createdTier1.get(tier1);
                    legacyCategory = legacyCategories.get(tier1);
                    if (!(tier3Category && tier1Category && legacyCategory)) return [3 /*break*/, 25];
                    _j.label = 22;
                case 22:
                    _j.trys.push([22, 24, , 25]);
                    return [4 /*yield*/, prisma.service.create({
                            data: {
                                name: title,
                                description: "".concat(row['Original_Service_Name'], " - ").concat(tier3),
                                categoryId: legacyCategory.id, // Legacy category field
                                tier1CategoryId: tier1Category.id,
                                tier3ItemId: tier3Category.id,
                                supportGroupId: defaultSupportGroup.id, // Use supportGroupId instead of enum
                                priority: mapPriority(row['Priority']),
                                estimatedHours: parseSlaToHours(row['Resolution_Time']),
                                slaHours: parseSlaToHours(row['Resolution_Time']),
                                responseHours: parseSlaToHours(row['First_Response']),
                                resolutionHours: parseSlaToHours(row['Resolution_Time']),
                                requiresApproval: mapItilCategory(row['ITIL_Category']) === 'CHANGE_REQUEST',
                                defaultItilCategory: mapItilCategory(row['ITIL_Category']),
                                defaultIssueClassification: mapIssueClassification(row['Issue_Classification']),
                                defaultTitle: title
                            }
                        })];
                case 23:
                    service = _j.sent();
                    services.push(service);
                    return [3 /*break*/, 25];
                case 24:
                    error_1 = _j.sent();
                    console.warn("Failed to create service for ".concat(title, ":"), error_1);
                    return [3 /*break*/, 25];
                case 25:
                    _h++;
                    return [3 /*break*/, 21];
                case 26:
                    // Create sample tickets
                    console.log('Creating sample tickets...');
                    tickets = [];
                    if (!(services.length > 0)) return [3 /*break*/, 28];
                    return [4 /*yield*/, Promise.all([
                            prisma.ticket.create({
                                data: {
                                    ticketNumber: 'TKT-001',
                                    title: 'ATM Terminal Registration Request',
                                    description: 'Request for new ATM terminal registration at branch location',
                                    serviceId: services[0].id,
                                    priority: 'MEDIUM',
                                    status: 'PENDING_APPROVAL',
                                    createdById: users[3].id,
                                    branchId: branches[0].id,
                                    supportGroupId: defaultSupportGroup.id, // Use supportGroupId
                                },
                            }),
                            prisma.ticket.create({
                                data: {
                                    ticketNumber: 'TKT-002',
                                    title: 'Application Error Report',
                                    description: 'Application experiencing errors during operation',
                                    serviceId: services[Math.min(1, services.length - 1)].id,
                                    priority: 'HIGH',
                                    status: 'IN_PROGRESS',
                                    createdById: users[3].id,
                                    assignedToId: users[2].id,
                                    branchId: branches[0].id,
                                    supportGroupId: defaultSupportGroup.id, // Use supportGroupId
                                },
                            }),
                        ])];
                case 27:
                    sampleTickets = _j.sent();
                    tickets.push.apply(tickets, sampleTickets);
                    _j.label = 28;
                case 28:
                    console.log('Database seeded successfully!');
                    console.log("Created ".concat(branches.length, " branches"));
                    console.log("Created ".concat(users.length, " users"));
                    console.log("Created ".concat(createdTier1.size, " Tier 1 categories"));
                    console.log("Created ".concat(createdTier2.size, " Tier 2 subcategories"));
                    console.log("Created ".concat(createdTier3.size, " Tier 3 items"));
                    console.log("Created ".concat(services.length, " services"));
                    console.log("Created ".concat(tickets.length, " sample tickets"));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
