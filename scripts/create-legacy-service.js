#!/usr/bin/env node

/**
 * Script to create the Legacy Tickets service in the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createLegacyService() {
  console.log('🚀 Creating Legacy Tickets service...');

  try {
    // First, get or create the Legacy category
    let category = await prisma.serviceCategory.findFirst({
      where: { name: 'Legacy Systems' }
    });

    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          name: 'Legacy Systems',
          description: 'Services for managing tickets imported from legacy systems',
          isActive: true,
          parentId: null
        }
      });
      console.log('✅ Created Legacy Systems category');
    } else {
      console.log('✅ Found existing Legacy Systems category');
    }

    // Check if Legacy Tickets service already exists
    let service = await prisma.service.findFirst({
      where: { 
        name: 'Legacy Tickets',
        categoryId: category.id 
      }
    });

    if (!service) {
      service = await prisma.service.create({
        data: {
          name: 'Legacy Tickets',
          description: 'Service for tickets imported from ManageEngine and other legacy systems. Used for historical ticket data that has been migrated to the new system.',
          helpText: 'This service is used automatically by the import system for legacy tickets. Legacy tickets preserve the original data from the source system and can be converted to regular tickets if needed.',
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
          businessHoursOnly: false,
          supportGroupId: null // Will be assigned based on the legacy ticket data
        }
      });
      console.log('✅ Created Legacy Tickets service');
    } else {
      console.log('✅ Found existing Legacy Tickets service');
    }

    console.log(`📋 Service Details:`);
    console.log(`   ID: ${service.id}`);
    console.log(`   Name: ${service.name}`);
    console.log(`   Category: ${category.name}`);
    console.log(`   Description: ${service.description}`);

    return service;

  } catch (error) {
    console.error('❌ Error creating legacy service:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
if (require.main === module) {
  createLegacyService()
    .then(() => {
      console.log('🎉 Legacy Tickets service creation completed!');
      process.exit(0);
    })
    .catch(console.error);
}

module.exports = { createLegacyService };