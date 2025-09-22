'use client';

import AnnouncementForm from '@/components/admin/announcement-form';

export default function EditAnnouncementPage({
  params
}: {
  params: { id: string }
}) {
  return <AnnouncementForm announcementId={params.id} />;
}