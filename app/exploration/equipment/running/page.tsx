import { redirect } from 'next/navigation';

export default function LegacyRunningEquipmentPage() {
  // Manteniamo questo endpoint per URL legacy già condivisi/bookmark.
  redirect('/exploration/running/equipment');
}

