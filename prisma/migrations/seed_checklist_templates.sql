-- ============================================
-- Seed: Daily Checklist Templates (4 Types)
-- Date: 2026-02-04
-- Total: 27 templates
-- ============================================

-- Clear existing templates (optional - uncomment if needed)
-- DELETE FROM "server_access_checklist_templates";

-- ============================================
-- SERVER_SIANG - Daytime Server Checklist (08:00 - 20:00)
-- PIC: Any staff with server access
-- Total: 8 items
-- ============================================

INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt")
VALUES
-- Periodic monitoring every 2 hours
(gen_random_uuid(), 'Pemantauan Server Pukul 08:00', 'Periksa kondisi server pada jam 08:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_SIANG', 1, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 10:00', 'Periksa kondisi server pada jam 10:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_SIANG', 2, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 12:00', 'Periksa kondisi server pada jam 12:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_SIANG', 3, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 14:00', 'Periksa kondisi server pada jam 14:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_SIANG', 4, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 16:00', 'Periksa kondisi server pada jam 16:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_SIANG', 5, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 18:00', 'Periksa kondisi server pada jam 18:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_SIANG', 6, true, true, '18:00', NOW(), NOW()),
-- General daytime tasks
(gen_random_uuid(), 'Review security logs pagi', 'Periksa log keamanan untuk aktivitas mencurigakan selama malam sebelumnya', 'SECURITY_CHECK', 'SERVER_SIANG', 10, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Cek status scheduled jobs', 'Pastikan scheduled jobs berjalan sesuai jadwal', 'MAINTENANCE', 'SERVER_SIANG', 11, true, true, NULL, NOW(), NOW())

ON CONFLICT DO NOTHING;

-- ============================================
-- SERVER_MALAM - Nighttime Server Checklist (20:00 - 07:59)
-- PIC: Shift Standby only
-- Total: 10 items
-- ============================================

INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt")
VALUES
-- Periodic monitoring every 2 hours
(gen_random_uuid(), 'Pemantauan Server Pukul 20:00', 'Periksa kondisi server pada jam 20:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_MALAM', 1, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 22:00', 'Periksa kondisi server pada jam 22:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_MALAM', 2, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 00:00', 'Periksa kondisi server pada jam 00:00 WITA (tengah malam). Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_MALAM', 3, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 02:00', 'Periksa kondisi server pada jam 02:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_MALAM', 4, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 04:00', 'Periksa kondisi server pada jam 04:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_MALAM', 5, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), 'Pemantauan Server Pukul 06:00', 'Periksa kondisi server pada jam 06:00 WITA. Catat status CPU, memory, disk, dan service penting.', 'SERVER_HEALTH', 'SERVER_MALAM', 6, true, true, '06:00', NOW(), NOW()),
-- Backup verification (night shift responsibility)
(gen_random_uuid(), 'Verifikasi backup database utama', 'Pastikan backup database utama berhasil dilakukan dan file backup tersedia', 'BACKUP_VERIFICATION', 'SERVER_MALAM', 10, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), 'Verifikasi backup incremental', 'Cek status backup incremental harian', 'BACKUP_VERIFICATION', 'SERVER_MALAM', 11, true, true, '22:30', NOW(), NOW()),
(gen_random_uuid(), 'Cek integritas file backup', 'Verifikasi bahwa file backup tidak corrupt dan dapat di-restore', 'BACKUP_VERIFICATION', 'SERVER_MALAM', 12, false, true, NULL, NOW(), NOW()),
-- Morning handover preparation
(gen_random_uuid(), 'Persiapan serah terima pagi', 'Siapkan catatan kejadian malam untuk handover ke shift pagi', 'MAINTENANCE', 'SERVER_MALAM', 20, true, true, '06:00', NOW(), NOW())

ON CONFLICT DO NOTHING;

-- ============================================
-- HARIAN - Daily Operational Checklist (08:00 - branch closed)
-- PIC: Shift Operasional
-- Total: 4 items
-- ============================================

INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt")
VALUES
(gen_random_uuid(), 'Cek status sistem utama', 'Verifikasi semua sistem utama berjalan normal', 'SERVER_HEALTH', 'HARIAN', 1, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Review tiket pending', 'Tinjau tiket yang masih pending dari hari sebelumnya', 'MAINTENANCE', 'HARIAN', 2, true, true, NULL, NOW(), NOW()),
(gen_random_uuid(), 'Koordinasi dengan tim cabang', 'Konfirmasi status operasional dengan tim cabang', 'MAINTENANCE', 'HARIAN', 3, false, true, NULL, NOW(), NOW()),
-- Placeholder - user will provide actual items
(gen_random_uuid(), '[Placeholder] Tugas harian 1', 'Item placeholder - akan diganti dengan tugas harian sebenarnya', 'MAINTENANCE', 'HARIAN', 100, false, true, NULL, NOW(), NOW())

ON CONFLICT DO NOTHING;

-- ============================================
-- AKHIR_HARI - End of Day Checklist (before handover ~18:00-20:00)
-- PIC: Shift Operasional
-- Total: 5 items
-- ============================================

INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt")
VALUES
(gen_random_uuid(), 'Rangkuman aktivitas hari ini', 'Buat ringkasan aktivitas dan kejadian penting selama shift', 'MAINTENANCE', 'AKHIR_HARI', 1, true, true, '17:00', NOW(), NOW()),
(gen_random_uuid(), 'Update status tiket', 'Pastikan semua tiket yang dikerjakan sudah di-update statusnya', 'MAINTENANCE', 'AKHIR_HARI', 2, true, true, NULL, NOW(), NOW()),
(gen_random_uuid(), 'Catatan serah terima', 'Siapkan catatan penting untuk shift malam', 'MAINTENANCE', 'AKHIR_HARI', 3, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), 'Verifikasi final sistem', 'Pastikan semua sistem dalam kondisi stabil sebelum handover', 'SERVER_HEALTH', 'AKHIR_HARI', 4, true, true, '19:00', NOW(), NOW()),
-- Placeholder - user will provide actual items
(gen_random_uuid(), '[Placeholder] Tugas akhir hari 1', 'Item placeholder - akan diganti dengan tugas akhir hari sebenarnya', 'MAINTENANCE', 'AKHIR_HARI', 100, false, true, NULL, NOW(), NOW())

ON CONFLICT DO NOTHING;

-- ============================================
-- Verification: Count templates per type
-- ============================================
-- SELECT "checklistType", COUNT(*) as count
-- FROM "server_access_checklist_templates"
-- WHERE "isActive" = true
-- GROUP BY "checklistType"
-- ORDER BY "checklistType";
