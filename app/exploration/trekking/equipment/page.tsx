import EquipmentPage from '@/components/EquipmentPage';
import equipmentData from '@/lib/data/equipment.json';
import { hydrateEquipmentFromCloudinary } from '@/lib/cloudinary/equipment';

export default async function TrekkingEquipmentPage() {
  const items = await hydrateEquipmentFromCloudinary(equipmentData.trekking);

  return (
    <EquipmentPage
      title="Attrezzatura Trekking"
      backUrl="/exploration/trekking"
      items={items}
      background="sky"
      tone="purple"
    />
  );
}

