const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareSchema() {
  console.log('\n🔍 Database Schema Comparison Tool\n');
  console.log('='.repeat(60));

  try {
    // 1. Check existing tables
    console.log('\n📋 CHECKING TABLES...\n');
    const existingTables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tableNames = existingTables.map(t => t.table_name.toLowerCase());

    const expectedTables = [
      'User', 'Account', 'Session', 'Branch', 'SupportGroup', 'SupportGroupMember',
      'ServiceCategory', 'ServiceSubcategory', 'ServiceItem', 'Service', 'ServiceField',
      'FieldTemplate', 'Ticket', 'TicketComment', 'TicketAttachment', 'TicketHistory',
      'TicketTask', 'TaskTemplate', 'ApprovalLevel', 'ApprovalRequest', 'SLAConfig',
      'SLABreach', 'ATM', 'ATMClaim', 'ATMClaimAttachment', 'NetworkEntity',
      'NetworkMonitoringLog', 'NetworkIncident', 'PingResult', 'Notification',
      'AuditLog', 'ImportLog', 'LoginAttempt', 'ApiKey', 'SystemSetting',
      'VerificationToken', 'KnowledgeBase', 'FAQ', 'Announcement', 'Report',
      'Dashboard', 'DashboardWidget', 'Shift', 'ShiftAssignment', 'ShiftHandover',
      'ShiftLog', 'ShiftSchedule', '_prisma_migrations'
    ];

    const missingTables = [];
    const existingTablesList = [];

    for (const table of expectedTables) {
      if (tableNames.includes(table.toLowerCase())) {
        existingTablesList.push(table);
      } else {
        missingTables.push(table);
      }
    }

    console.log(`✅ Existing tables (${existingTablesList.length}):`);
    existingTablesList.forEach(t => console.log(`   • ${t}`));

    if (missingTables.length > 0) {
      console.log(`\n❌ Missing tables (${missingTables.length}):`);
      missingTables.forEach(t => console.log(`   • ${t}`));
    } else {
      console.log('\n✅ All expected tables exist!');
    }

    // 2. Check existing enums
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 CHECKING ENUMS...\n');

    const existingEnums = await prisma.$queryRaw`
      SELECT t.typname as enum_name,
             string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `;

    const enumNames = existingEnums.map(e => e.enum_name.toLowerCase());

    const expectedEnums = [
      'UserRole', 'TicketStatus', 'TicketPriority', 'TicketSource', 'ApprovalStatus',
      'NetworkStatus', 'DeviceState', 'NetworkMediaType', 'IncidentSeverity',
      'IncidentStatus', 'ATMStatus', 'ClaimStatus', 'ClaimType', 'NotificationType',
      'AuditAction', 'FieldType', 'ApiKeyPermission', 'ApiKeyService', 'ShiftType',
      'ShiftStatus', 'HandoverStatus'
    ];

    const missingEnums = [];
    const existingEnumsList = [];

    for (const enumName of expectedEnums) {
      if (enumNames.includes(enumName.toLowerCase())) {
        existingEnumsList.push(enumName);
      } else {
        missingEnums.push(enumName);
      }
    }

    console.log(`✅ Existing enums (${existingEnumsList.length}):`);
    existingEnums.forEach(e => console.log(`   • ${e.enum_name}: ${e.enum_values}`));

    if (missingEnums.length > 0) {
      console.log(`\n❌ Missing enums (${missingEnums.length}):`);
      missingEnums.forEach(e => console.log(`   • ${e}`));
    } else {
      console.log('\n✅ All expected enums exist!');
    }

    // 3. Check NetworkMonitoringLog columns specifically
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 CHECKING NetworkMonitoringLog COLUMNS...\n');

    const nmlColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'NetworkMonitoringLog'
      ORDER BY ordinal_position
    `;

    const nmlColumnNames = nmlColumns.map(c => c.column_name.toLowerCase());

    const expectedNmlColumns = [
      'id', 'entityType', 'entityId', 'ipAddress', 'status', 'responseTimeMs',
      'packetLoss', 'errorMessage', 'checkedAt', 'previousStatus', 'statusChangedAt',
      'downSince', 'uptimeSeconds', 'downtimeSeconds', 'deviceState',
      'consecutiveFailures', 'consecutiveSuccesses', 'lastStateChange'
    ];

    if (nmlColumns.length === 0) {
      console.log('❌ Table NetworkMonitoringLog does not exist!');
    } else {
      console.log('Existing columns:');
      nmlColumns.forEach(c => console.log(`   ✅ ${c.column_name} (${c.data_type})`));

      const missingNmlColumns = expectedNmlColumns.filter(
        col => !nmlColumnNames.includes(col.toLowerCase())
      );

      if (missingNmlColumns.length > 0) {
        console.log('\n❌ Missing columns:');
        missingNmlColumns.forEach(c => console.log(`   • ${c}`));
      } else {
        console.log('\n✅ All expected columns exist!');
      }
    }

    // 4. Check applied migrations
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 APPLIED MIGRATIONS...\n');

    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, started_at, finished_at,
               CASE WHEN finished_at IS NOT NULL THEN '✅' ELSE '❌ FAILED' END as status
        FROM "_prisma_migrations"
        ORDER BY started_at
      `;

      migrations.forEach(m => {
        console.log(`   ${m.status} ${m.migration_name}`);
      });
    } catch (e) {
      console.log('   ❌ No _prisma_migrations table found');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY\n');
    console.log(`Tables:  ${existingTablesList.length} exist, ${missingTables.length} missing`);
    console.log(`Enums:   ${existingEnumsList.length} exist, ${missingEnums.length} missing`);

    if (missingTables.length > 0 || missingEnums.length > 0) {
      console.log('\n⚠️  Your database is out of sync with the Prisma schema.');
      console.log('\nTo fix this, you have several options:\n');
      console.log('1. Reset migrations and baseline (recommended for this error):');
      console.log('   npx prisma migrate resolve --applied 20251007000000_baseline_with_shift_management\n');
      console.log('2. Or push schema directly (for development):');
      console.log('   npx prisma db push --accept-data-loss\n');
      console.log('3. Or manually add missing columns with SQL (see below)');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareSchema();
