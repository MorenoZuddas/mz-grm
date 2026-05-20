"use client";

import EquipmentPage from '@/components/EquipmentPage';
import equipmentData from '@/lib/data/equipment.json';

export default function RunningEquipmentPage() {
  return (
    <EquipmentPage
      title="Attrezzatura Running"
      backUrl="/exploration/running"
      items={equipmentData.running}
      background="sky"
      tone="blue"
    />
  );
}

