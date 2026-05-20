export type EquipmentCondition = 'Nuovo' | 'Buono' | 'Usurato';
export type EquipmentCardColor = 'default' | 'soft' | 'sky' | 'glass' | 'navy';

export interface EquipmentItem {
  id: string;
  name?: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  description: string;
  icon: string;
  km?: number;
  condition: EquipmentCondition;
  url?: string;
  image?: string;
  productDescription?: string;
  productUrl?: string;
  cardColor?: EquipmentCardColor;
  visible?: boolean;
}

