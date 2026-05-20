"use client";

import EquipmentPage from '@/components/EquipmentPage';
import equipmentData from '@/lib/data/equipment.json';

export default function TrekkingEquipmentPage() {
  return (
    <EquipmentPage
      title="Attrezzatura Trekking"
      backUrl="/exploration/trekking"
      items={equipmentData.trekking}
      background="sky"
      tone="purple"
    />
  );
}

