-- Seed Shift Checklist Templates
-- Run with: psql -d servicedesk_database -f seed_shift_checklist_templates.sql

-- Clear existing templates (optional)
DELETE FROM shift_checklist_templates;

-- ============================================
-- Pemantauan Sistem (SYSTEM_MONITORING)
-- ============================================
INSERT INTO shift_checklist_templates (id, "shiftType", category, title, description, "order", "isRequired", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, NULL, 'SYSTEM_MONITORING', 'Periksa dashboard monitoring utama', 'Pastikan semua sistem monitoring aktif dan tidak ada alert kritis', 1, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'SYSTEM_MONITORING', 'Tinjau dan tangani alert sistem', 'Periksa notifikasi alert dan tangani yang memerlukan tindakan segera', 2, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'SYSTEM_MONITORING', 'Periksa status jaringan cabang', 'Verifikasi konektivitas jaringan semua cabang melalui monitoring', 3, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'SYSTEM_MONITORING', 'Periksa status ATM', 'Monitor status operasional ATM dan identifikasi ATM yang offline', 4, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'SYSTEM_MONITORING', 'Verifikasi backup sistem', 'Pastikan backup terjadwal berjalan dengan sukses', 5, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'SYSTEM_MONITORING', 'Periksa kesehatan server', 'Review metrik server (CPU, RAM, Disk, Network)', 6, true, true, NOW(), NOW());

-- ============================================
-- Manajemen Tiket (TICKET_MANAGEMENT)
-- ============================================
INSERT INTO shift_checklist_templates (id, "shiftType", category, title, description, "order", "isRequired", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, NULL, 'TICKET_MANAGEMENT', 'Tinjau tiket terbuka yang ditugaskan', 'Periksa daftar tiket yang ditugaskan kepada Anda', 1, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'TICKET_MANAGEMENT', 'Periksa pelanggaran SLA', 'Identifikasi tiket yang mendekati atau melewati batas SLA', 2, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'TICKET_MANAGEMENT', 'Tangani eskalasi tiket', 'Proses tiket yang dieskalasi dan memerlukan perhatian segera', 3, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'TICKET_MANAGEMENT', 'Perbarui status tiket yang dikerjakan', 'Update progress dan status tiket yang sedang ditangani', 4, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'TICKET_MANAGEMENT', 'Dokumentasikan resolusi tiket', 'Catat solusi dan langkah penyelesaian tiket yang selesai', 5, false, true, NOW(), NOW());

-- ============================================
-- Serah Terima (HANDOVER_TASKS)
-- ============================================
INSERT INTO shift_checklist_templates (id, "shiftType", category, title, description, "order", "isRequired", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, NULL, 'HANDOVER_TASKS', 'Siapkan catatan serah terima', 'Dokumentasikan hal-hal penting untuk shift berikutnya', 1, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'HANDOVER_TASKS', 'Dokumentasikan masalah yang belum selesai', 'Catat issue yang masih pending dan perlu dilanjutkan', 2, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'HANDOVER_TASKS', 'Briefing ke shift berikutnya', 'Sampaikan informasi penting kepada teknisi shift berikutnya', 3, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'HANDOVER_TASKS', 'Perbarui log shift', 'Lengkapi catatan aktivitas selama shift', 4, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, NULL, 'HANDOVER_TASKS', 'Lengkapi laporan shift', 'Finalisasi dan submit laporan shift', 5, true, true, NOW(), NOW());

-- Verify
SELECT category, COUNT(*) as count FROM shift_checklist_templates GROUP BY category ORDER BY category;
