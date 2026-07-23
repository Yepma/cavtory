
export enum Category {
  Cooking = 'Cooking',
  HomeCleaning = 'Home Cleaning',
  PersonalCare = 'Personal Care',
  Botiquin = 'Botiquín'
}

export type TransactionType = 'IN' | 'OUT';

export interface Product {
  barcodeId: string;
  brand: string;
  name: string;
  size: string;
  category: Category;
  productType?: string;
  quantity: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  barcodeId: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
}

export interface RecognitionResult {
  barcode?: string;
  brand?: string;
  name?: string;
  size?: string;
  category?: Category;
  product_type?: string;
}

export interface ShoppingListItem {
  id?: string;
  barcodeId: string;
  quantity: number;
  bought: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  status: 'active' | 'archived';
  createdAt: string;
}

export type ViewState = 'home' | 'verify' | 'lists';
