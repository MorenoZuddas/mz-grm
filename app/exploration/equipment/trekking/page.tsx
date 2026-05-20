import { redirect } from 'next/navigation';

export default function LegacyTrekkingEquipmentPage() {
  // Manteniamo questo endpoint per URL legacy già condivisi/bookmark.
  redirect('/exploration/trekking/equipment');
}

