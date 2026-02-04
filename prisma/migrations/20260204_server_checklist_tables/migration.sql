-- ============================================
-- Migration: Server Access Checklist Tables
-- Date: 2026-02-04
-- ============================================

-- STEP 1: Create Enums (if not exist)

DO $$ BEGIN
    CREATE TYPE "ServerChecklistCategory" AS ENUM ('BACKUP_VERIFICATION', 'SERVER_HEALTH', 'SECURITY_CHECK', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ServerChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DailyChecklistType" AS ENUM ('HARIAN', 'SERVER_SIANG', 'SERVER_MALAM', 'AKHIR_HARI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- STEP 2: Create Tables

CREATE TABLE IF NOT EXISTS "server_access_checklist_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServerChecklistCategory" NOT NULL,
    "checklistType" "DailyChecklistType" NOT NULL DEFAULT 'SERVER_SIANG',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unlockTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "server_access_checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "server_access_daily_checklists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checklistType" "DailyChecklistType" NOT NULL DEFAULT 'SERVER_SIANG',
    "status" "ServerChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "server_access_daily_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "server_access_checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServerChecklistCategory" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShiftChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "unlockTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "server_access_checklist_items_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "server_access_checklist_templates_checklistType_category_idx" ON "server_access_checklist_templates"("checklistType", "category", "isActive", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "server_access_daily_checklists_userId_date_checklistType_key" ON "server_access_daily_checklists"("userId", "date", "checklistType");
CREATE INDEX IF NOT EXISTS "server_access_daily_checklists_userId_date_checklistType_idx" ON "server_access_daily_checklists"("userId", "date", "checklistType");
CREATE INDEX IF NOT EXISTS "server_access_daily_checklists_date_status_checklistType_idx" ON "server_access_daily_checklists"("date", "status", "checklistType");
CREATE INDEX IF NOT EXISTS "server_access_checklist_items_checklistId_category_idx" ON "server_access_checklist_items"("checklistId", "category");
CREATE INDEX IF NOT EXISTS "server_access_checklist_items_checklistId_order_idx" ON "server_access_checklist_items"("checklistId", "order");

-- Foreign keys
ALTER TABLE "server_access_daily_checklists" DROP CONSTRAINT IF EXISTS "server_access_daily_checklists_userId_fkey";
ALTER TABLE "server_access_daily_checklists" ADD CONSTRAINT "server_access_daily_checklists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "server_access_checklist_items" DROP CONSTRAINT IF EXISTS "server_access_checklist_items_checklistId_fkey";
ALTER TABLE "server_access_checklist_items" ADD CONSTRAINT "server_access_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "server_access_daily_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- STEP 3: Insert Template Data

DELETE FROM "server_access_checklist_templates";

-- HARIAN
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Verifikasi Ticket Pending H-1', 'Verifikasi semua ticket berstatus PENDING, PENDING_VENDOR, dan OPEN dari hari sebelumnya (H-1 WITA). Pastikan semua ticket sudah ditindaklanjuti.', 'MAINTENANCE', 'HARIAN', 1, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Review Catatan Serah Terima', 'Review dan terima notes serah terima dari shift malam. Catat masalah yang masih berjalan dan perlu ditindaklanjuti.', 'MAINTENANCE', 'HARIAN', 2, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Status Cabang Buka', 'Catat status operasional semua cabang: jam berapa cabang buka, apakah ada kendala saat pembukaan.', 'MAINTENANCE', 'HARIAN', 3, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Grafik Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 11, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Masalah Operasional', 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll. (Pemeriksaan pukul 08:00 WITA)', 'MAINTENANCE', 'HARIAN', 12, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Koneksi Aplikasi', 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal. (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 13, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Grafik Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 21, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Masalah Operasional', 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll. (Pemeriksaan pukul 10:00 WITA)', 'MAINTENANCE', 'HARIAN', 22, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Koneksi Aplikasi', 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal. (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 23, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Grafik Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 31, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Masalah Operasional', 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll. (Pemeriksaan pukul 12:00 WITA)', 'MAINTENANCE', 'HARIAN', 32, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Koneksi Aplikasi', 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal. (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 33, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Grafik Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 41, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Masalah Operasional', 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll. (Pemeriksaan pukul 14:00 WITA)', 'MAINTENANCE', 'HARIAN', 42, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Koneksi Aplikasi', 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal. (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 43, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Grafik Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 51, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Masalah Operasional', 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll. (Pemeriksaan pukul 16:00 WITA)', 'MAINTENANCE', 'HARIAN', 52, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Koneksi Aplikasi', 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal. (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 53, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Grafik Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 61, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Masalah Operasional', 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll. (Pemeriksaan pukul 18:00 WITA)', 'MAINTENANCE', 'HARIAN', 62, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Koneksi Aplikasi', 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal. (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'HARIAN', 63, true, true, '18:00', NOW(), NOW());

-- AKHIR_HARI
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Status Cabang Tutup', 'Catat status operasional cabang tutup: jam berapa cabang tutup, apakah ada kendala saat penutupan.', 'MAINTENANCE', 'AKHIR_HARI', 1, true, true, '15:00', NOW(), NOW()),
(gen_random_uuid(), 'Rekap Masalah Hari Ini', 'Buat rekap semua masalah yang terjadi hari ini: yang sudah selesai dan yang masih pending.', 'MAINTENANCE', 'AKHIR_HARI', 2, true, true, '17:00', NOW(), NOW()),
(gen_random_uuid(), 'Catatan Serah Terima ke Malam', 'Siapkan catatan serah terima untuk shift malam: pending issues, follow-up yang diperlukan, informasi penting lainnya.', 'MAINTENANCE', 'AKHIR_HARI', 3, true, true, '18:00', NOW(), NOW());

-- SERVER_SIANG
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Status Reporting', 'Cek status sistem reporting: apakah semua report berjalan normal, ada error atau pending.', 'SERVER_HEALTH', 'SERVER_SIANG', 1, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Status Staging', 'Cek status file staging: apakah ada file yang perlu diproses, error, atau backlog.', 'MAINTENANCE', 'SERVER_SIANG', 2, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Usage Metrics', 'Review usage metrics server: CPU, Memory, Disk usage. Catat jika ada anomali.', 'SERVER_HEALTH', 'SERVER_SIANG', 3, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Status Backup', 'Verifikasi status backup: apakah backup semalam berhasil, cek log dan ukuran file backup.', 'BACKUP_VERIFICATION', 'SERVER_SIANG', 4, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 11, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 12, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 08:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 13, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 21, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 22, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 10:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 23, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 31, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 32, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 12:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 33, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 41, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 42, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 14:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 43, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 51, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 52, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 16:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 53, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 61, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 62, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 18:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 63, true, true, '18:00', NOW(), NOW());

-- SERVER_MALAM
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Status Permasalahan untuk Serah Terima', 'Catat status semua permasalahan yang terjadi malam ini untuk diserahterimakan ke shift pagi.', 'MAINTENANCE', 'SERVER_MALAM', 1, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), 'List Kegiatan Malam', 'Catat semua kegiatan yang dilakukan malam ini: update sistem, backup manual, maintenance, dll.', 'MAINTENANCE', 'SERVER_MALAM', 2, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 20:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 11, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 20:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 12, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 20:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 13, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Status Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 20:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 14, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Status Operasional', 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll. (Pemeriksaan pukul 20:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 15, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 22:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 21, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 22:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 22, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 22:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 23, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Status Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 22:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 24, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Status Operasional', 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll. (Pemeriksaan pukul 22:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 25, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 00:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 31, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 00:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 32, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 00:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 33, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Status Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 00:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 34, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Status Operasional', 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll. (Pemeriksaan pukul 00:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 35, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 02:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 41, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 02:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 42, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 02:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 43, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Status Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 02:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 44, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Status Operasional', 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll. (Pemeriksaan pukul 02:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 45, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 04:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 51, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 04:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 52, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 04:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 53, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Status Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 04:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 54, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Status Operasional', 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll. (Pemeriksaan pukul 04:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 55, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Status Aplikasi Critical', 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal. (Pemeriksaan pukul 06:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 61, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Status Aplikasi Surrounding', 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll. (Pemeriksaan pukul 06:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 62, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Status Alert ATM', 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 06:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 63, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Status Grafana', 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya. (Pemeriksaan pukul 06:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 64, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Status Operasional', 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll. (Pemeriksaan pukul 06:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 65, true, true, '06:00', NOW(), NOW());

-- Verify
SELECT "checklistType", COUNT(*) FROM "server_access_checklist_templates" GROUP BY "checklistType" ORDER BY "checklistType";
