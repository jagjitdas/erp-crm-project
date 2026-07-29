export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  followUps?: FollowUp[];
  challans?: Challan[];
}

export interface FollowUp {
  id: string;
  note: string;
  followUpOn?: string | null;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string | number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  isActive: boolean;
  stockMovements?: StockMovement[];
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  reference?: string | null;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string | number;
  quantity: number;
  lineTotal: string | number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer?: Customer | { name: string; mobile: string };
  totalQuantity: number;
  status: ChallanStatus;
  createdAt: string;
  items: ChallanItem[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}
