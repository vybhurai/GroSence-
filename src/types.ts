export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
}

export interface Shop {
  id: string;
  name: string;
  category: string;
  opening_time: string;
  closing_time: string;
  owner_id: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  barcode: string;
  price: number;
  cost: number; // Added for profit calculations
  category: string;
  image_url: string;
}

export interface InventoryItem {
  id: string;
  shop_id: string;
  product_id: string;
  quantity: number;
  reorder_level: number; // For low stock alerts
}

export interface Sale {
  id: string;
  shop_id: string;
  product_id: string;
  quantity: number;
  amount: number;
  created_at: string; // ISO String
}

export interface CalendarEvent {
  id: string;
  shop_id: string;
  title: string;
  event_date: string; // YYYY-MM-DD
  is_holiday: boolean;
  event_type: 'holiday' | 'promotional' | 'special_sale';
}

export interface Prediction {
  id: string;
  shop_id: string;
  product_id: string;
  predicted_1_day: number;
  predicted_7_day: number;
  predicted_14_day: number;
  created_at: string; // ISO String
}

// Full detailed database state
export interface DatabaseState {
  users: User[];
  shops: Shop[];
  products: Product[];
  inventory: InventoryItem[];
  sales: Sale[];
  calendar_events: CalendarEvent[];
  predictions: Prediction[];
}
