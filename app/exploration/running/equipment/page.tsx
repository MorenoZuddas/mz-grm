import { redirect } from 'next/navigation';

export default function RunningEquipmentPage() {
  redirect('/exploration/equipment?focus=running#section-running');
}

