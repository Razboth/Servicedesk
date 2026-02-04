-- ============================================
-- Seed: Daily Checklist Templates (4 Types)
-- Date: 2026-02-04
-- Total: 60 templates
-- Based on: checklist items.xlsx
-- ============================================

-- Clear existing templates first
DELETE FROM "server_access_checklist_templates";

-- ============================================
-- SERVER_SIANG - Daytime Server Checklist (08:00 - 18:00)
-- PIC: Any staff with server access
-- Total: 24 items (4 items x 6 time slots)
-- ============================================

-- 08:00 Slot
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), '[08:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 1, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 2, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 08:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 3, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), '[08:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 08:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 4, true, true, '08:00', NOW(), NOW()),

-- 10:00 Slot
(gen_random_uuid(), '[10:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 11, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 12, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 10:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 13, true, true, '10:00', NOW(), NOW()),
(gen_random_uuid(), '[10:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 10:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 14, true, true, '10:00', NOW(), NOW()),

-- 12:00 Slot
(gen_random_uuid(), '[12:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 21, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 22, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 12:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 23, true, true, '12:00', NOW(), NOW()),
(gen_random_uuid(), '[12:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 12:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 24, true, true, '12:00', NOW(), NOW()),

-- 14:00 Slot
(gen_random_uuid(), '[14:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 31, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 32, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 14:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 33, true, true, '14:00', NOW(), NOW()),
(gen_random_uuid(), '[14:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 14:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 34, true, true, '14:00', NOW(), NOW()),

-- 16:00 Slot
(gen_random_uuid(), '[16:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 41, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 42, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 16:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 43, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), '[16:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 16:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 44, true, true, '16:00', NOW(), NOW()),

-- 18:00 Slot
(gen_random_uuid(), '[18:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 51, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 52, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 18:00 WITA)', 'SERVER_HEALTH', 'SERVER_SIANG', 53, true, true, '18:00', NOW(), NOW()),
(gen_random_uuid(), '[18:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 18:00 WITA)', 'MAINTENANCE', 'SERVER_SIANG', 54, true, true, '18:00', NOW(), NOW());

-- ============================================
-- SERVER_MALAM - Nighttime Server Checklist (20:00 - 06:00)
-- PIC: Shift Standby only
-- Total: 26 items (4 items x 6 time slots + 2 extra)
-- ============================================

INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
-- 20:00 Slot
(gen_random_uuid(), '[20:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 20:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 1, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 20:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 2, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 20:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 3, true, true, '20:00', NOW(), NOW()),
(gen_random_uuid(), '[20:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 20:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 4, true, true, '20:00', NOW(), NOW()),

-- 22:00 Slot
(gen_random_uuid(), '[22:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 22:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 11, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 22:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 12, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 22:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 13, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), '[22:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 22:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 14, true, true, '22:00', NOW(), NOW()),

-- 00:00 Slot
(gen_random_uuid(), '[00:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 00:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 21, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 00:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 22, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 00:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 23, true, true, '00:00', NOW(), NOW()),
(gen_random_uuid(), '[00:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 00:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 24, true, true, '00:00', NOW(), NOW()),

-- 02:00 Slot
(gen_random_uuid(), '[02:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 02:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 31, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 02:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 32, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 02:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 33, true, true, '02:00', NOW(), NOW()),
(gen_random_uuid(), '[02:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 02:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 34, true, true, '02:00', NOW(), NOW()),

-- 04:00 Slot
(gen_random_uuid(), '[04:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 04:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 41, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 04:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 42, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 04:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 43, true, true, '04:00', NOW(), NOW()),
(gen_random_uuid(), '[04:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 04:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 44, true, true, '04:00', NOW(), NOW()),

-- 06:00 Slot
(gen_random_uuid(), '[06:00] Status Server', 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal. (Pemeriksaan pukul 06:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 51, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Koneksi Jaringan', 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal. (Pemeriksaan pukul 06:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 52, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Koneksi Host 2 Host', 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll). (Pemeriksaan pukul 06:00 WITA)', 'SERVER_HEALTH', 'SERVER_MALAM', 53, true, true, '06:00', NOW(), NOW()),
(gen_random_uuid(), '[06:00] Status ATM', 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah. (Pemeriksaan pukul 06:00 WITA)', 'MAINTENANCE', 'SERVER_MALAM', 54, true, true, '06:00', NOW(), NOW()),

-- Extra night shift items
(gen_random_uuid(), 'Backup Database', 'Verifikasi backup database harian berhasil. Cek log backup dan ukuran file.', 'BACKUP_VERIFICATION', 'SERVER_MALAM', 100, true, true, '22:00', NOW(), NOW()),
(gen_random_uuid(), 'Persiapan Serah Terima Pagi', 'Siapkan catatan kejadian malam untuk handover ke shift pagi.', 'MAINTENANCE', 'SERVER_MALAM', 110, true, true, '06:00', NOW(), NOW());

-- ============================================
-- HARIAN - Daily Operational Checklist
-- PIC: Shift Operasional
-- Total: 5 items
-- ============================================

INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Koneksi Touch iOS', 'Cek koneksi dan fungsi aplikasi mobile banking iOS.', 'SERVER_HEALTH', 'HARIAN', 1, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Koneksi Touch Android', 'Cek koneksi dan fungsi aplikasi mobile banking Android.', 'SERVER_HEALTH', 'HARIAN', 2, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Koneksi QRIS', 'Verifikasi koneksi dan transaksi QRIS berjalan normal.', 'SERVER_HEALTH', 'HARIAN', 3, true, true, '08:00', NOW(), NOW()),
(gen_random_uuid(), 'Grafik Grafana', 'Monitor dashboard Grafana untuk anomali atau alert.', 'MAINTENANCE', 'HARIAN', 4, true, true, NULL, NOW(), NOW()),
(gen_random_uuid(), 'Review Tiket Pending', 'Tinjau tiket yang masih pending dari hari sebelumnya.', 'MAINTENANCE', 'HARIAN', 5, false, true, NULL, NOW(), NOW());

-- ============================================
-- AKHIR_HARI - End of Day Checklist
-- PIC: Shift Operasional (before handover)
-- Total: 5 items
-- ============================================

INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "checklistType", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Daily Server Usage', 'Dokumentasikan penggunaan resource server hari ini (peak usage, anomali).', 'SERVER_HEALTH', 'AKHIR_HARI', 1, true, true, '17:00', NOW(), NOW()),
(gen_random_uuid(), 'File Staging', 'Cek dan bersihkan file staging yang sudah tidak diperlukan.', 'MAINTENANCE', 'AKHIR_HARI', 2, true, true, '17:00', NOW(), NOW()),
(gen_random_uuid(), 'Report Harian', 'Siapkan laporan aktivitas harian untuk dokumentasi.', 'MAINTENANCE', 'AKHIR_HARI', 3, true, true, '17:00', NOW(), NOW()),
(gen_random_uuid(), 'Operasional Cabang', 'Konfirmasi status operasional semua cabang dan catat jika ada kendala.', 'MAINTENANCE', 'AKHIR_HARI', 4, true, true, '16:00', NOW(), NOW()),
(gen_random_uuid(), 'Catatan Serah Terima', 'Siapkan catatan penting untuk shift malam (pending issues, follow-up needed).', 'MAINTENANCE', 'AKHIR_HARI', 5, true, true, '18:00', NOW(), NOW());

-- ============================================
-- Verification: Count templates per type
-- ============================================
-- SELECT "checklistType", COUNT(*) as count
-- FROM "server_access_checklist_templates"
-- WHERE "isActive" = true
-- GROUP BY "checklistType"
-- ORDER BY "checklistType";
