"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const sync_1 = require("csv-parse/sync");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
async function seedTierCategories() {
    console.log('🌱 Seeding Tier Categories from CSV...');
    try {
        // Read and parse the CSV file
        const csvPath = (0, path_1.join)(process.cwd(), 'import1.csv');
        const fileContent = (0, fs_1.readFileSync)(csvPath, 'utf-8');
        const records = (0, sync_1.parse)(fileContent, {
            columns: true,
            skip_empty_lines: true,
            bom: true
        });
        // Extract unique tier categories
        const tier1Categories = new Map();
        const tier2Subcategories = new Map();
        const tier3Items = new Map();
        let tier1Order = 0;
        let tier2Order = 0;
        let tier3Order = 0;
        for (const record of records) {
            const tier1 = record['Tier_1_Category']?.trim();
            const tier2 = record['Tier_2_SubCategory']?.trim();
            const tier3 = record['Tier_3_Service_Type']?.trim();
            if (tier1 && !tier1Categories.has(tier1)) {
                tier1Categories.set(tier1, { name: tier1, order: ++tier1Order });
            }
            if (tier1 && tier2) {
                const key = `${tier1}|${tier2}`;
                if (!tier2Subcategories.has(key)) {
                    tier2Subcategories.set(key, { categoryName: tier1, name: tier2, order: ++tier2Order });
                }
            }
            if (tier2 && tier3) {
                const key = `${tier2}|${tier3}`;
                if (!tier3Items.has(key)) {
                    tier3Items.set(key, { subcategoryName: tier2, name: tier3, order: ++tier3Order });
                }
            }
        }
        // Clear existing tier categories (optional - comment out if you want to keep existing data)
        console.log('Clearing existing tier categories...');
        await prisma.item.deleteMany({});
        await prisma.subcategory.deleteMany({});
        await prisma.category.deleteMany({});
        // Create Tier 1 Categories
        console.log(`Creating ${tier1Categories.size} Tier 1 categories...`);
        const categoryMap = new Map();
        for (const [name, data] of tier1Categories) {
            const category = await prisma.category.create({
                data: {
                    name: data.name,
                    description: `${data.name} services and operations`,
                    order: data.order,
                    isActive: true
                }
            });
            categoryMap.set(name, category.id);
            console.log(`  ✓ Created category: ${name}`);
        }
        // Create Tier 2 Subcategories
        console.log(`Creating ${tier2Subcategories.size} Tier 2 subcategories...`);
        const subcategoryMap = new Map();
        for (const [key, data] of tier2Subcategories) {
            const categoryId = categoryMap.get(data.categoryName);
            if (categoryId) {
                const subcategory = await prisma.subcategory.create({
                    data: {
                        categoryId,
                        name: data.name,
                        description: `${data.name} related services`,
                        order: data.order,
                        isActive: true
                    }
                });
                subcategoryMap.set(data.name, subcategory.id);
                console.log(`  ✓ Created subcategory: ${data.name} under ${data.categoryName}`);
            }
        }
        // Create Tier 3 Items
        console.log(`Creating ${tier3Items.size} Tier 3 items...`);
        for (const [key, data] of tier3Items) {
            const subcategoryId = subcategoryMap.get(data.subcategoryName);
            if (subcategoryId) {
                await prisma.item.create({
                    data: {
                        subcategoryId,
                        name: data.name,
                        description: `${data.name} service item`,
                        order: data.order,
                        isActive: true
                    }
                });
                console.log(`  ✓ Created item: ${data.name} under ${data.subcategoryName}`);
            }
        }
        console.log('✅ Tier Categories seeded successfully!');
        // Now let's find and display the IDs for the Information Security service
        const infoSecCategory = await prisma.category.findFirst({
            where: { name: 'Information Security' },
            include: {
                subcategories: {
                    include: {
                        items: true
                    }
                }
            }
        });
        if (infoSecCategory) {
            console.log('\n📋 Information Security Category Structure:');
            console.log(`Category ID: ${infoSecCategory.id} - ${infoSecCategory.name}`);
            const securityServices = infoSecCategory.subcategories.find(sub => sub.name === 'Security Services');
            if (securityServices) {
                console.log(`  Subcategory ID: ${securityServices.id} - ${securityServices.name}`);
                const keamananInfo = securityServices.items.find(item => item.name === 'Keamanan Informasi');
                if (keamananInfo) {
                    console.log(`    Item ID: ${keamananInfo.id} - ${keamananInfo.name}`);
                    console.log('\n💡 Use these IDs to update the Information Security Request service:');
                    console.log(`  tier1CategoryId: "${infoSecCategory.id}"`);
                    console.log(`  tier2SubcategoryId: "${securityServices.id}"`);
                    console.log(`  tier3ItemId: "${keamananInfo.id}"`);
                }
            }
        }
    }
    catch (error) {
        console.error('❌ Error seeding tier categories:', error);
        throw error;
    }
}
async function main() {
    try {
        await seedTierCategories();
    }
    catch (error) {
        console.error('❌ Error in main:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
exports.default = main;
