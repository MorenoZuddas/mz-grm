import EquipmentPage from '@/components/EquipmentPage';
import equipmentData from '@/lib/data/equipment.json';
import { hydrateEquipmentFromCloudinary } from '@/lib/cloudinary/equipment';

export const dynamic = 'force-dynamic';

export default async function RunningEquipmentPage() {
  const items = await hydrateEquipmentFromCloudinary(equipmentData.running);

  return (
    <EquipmentPage
      title="Attrezzatura Running"
      backUrl="/exploration/running"
      items={items}
      background="sky"
      tone="blue"
    />
  );
}

