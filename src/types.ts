
// export enum UserRole {
//   CUSTOMER = 'CUSTOMER',
//   MANUFACTURER = 'MANUFACTURER',
//   ADMIN = 'ADMIN'
// }

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  status: 'active' | 'suspended' | 'pending_verification';
}

export interface Manufacturer {
  id: string;
  userId: string;
  companyName: string;
  location: string;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  bio: string;
  logoUrl: string;
  establishedYear: number;
  totalSales: number;
  revenue: number;
}

export interface Product {
  id: string;
  manufacturerId: string;
  name: string;
  description: string;
  price: number;
  retailPriceEstimation: number;
  category: string;
  stock: number;
  imageUrl: string;
  specifications: Record<string, string | number >;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  manufacturerId: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'card' | 'bank_transfer';
  transactionId?: string;
  accountName?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  fromUserId: string;
  toUserId: string;
  orderId?: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// export type AppView = 
//   | 'marketplace' 
//   | 'manufacturers' 
//   | 'process' 
//   | 'product-detail' 
//   | 'manufacturer-dashboard' 
//   | 'admin-dashboard'
//   | 'manufacturer-products'
//   | 'checkout'
//   | 'profile';


  // ===================== ENUMS =====================
export enum UserRole {
  CUSTOMER = 'customer',
  MANUFACTURER = 'manufacturer',
  ADMIN = 'admin',
  GUEST = 'guest'
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum ComplaintStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated'
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  NEW_MESSAGE = 'new_message',
  SYSTEM_ALERT = 'system_alert',
  PROMOTIONAL = 'promotional',
  SECURITY = 'security'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto',
  INVOICE = 'invoice'
}

export enum ShippingMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  PREMIUM = 'premium',
  BULK_FREIGHT = 'bulk_freight'
}

export enum ProductStatus {
  ACTIVE = 'active',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  COMING_SOON = 'coming_soon',
  LIMITED = 'limited'
}

export enum ManufacturerTier {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  PREMIUM = 'premium'
}

// ===================== CORE TYPES =====================
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  company?: string;
  country: string;
  status: 'active' | 'suspended' | 'pending_verification';
  createdAt: string;
  lastLoginAt?: string;
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
  billingAddress?: Address;
  shippingAddress?: Address;
  kycVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

export interface Manufacturer {
  id: string;
  userId: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl?: string;
  website?: string;
  country: string;
  city: string;
  industry: string;
  foundingYear?: number;
  employeeCount?: number;
  certifications: string[];
  minimumOrder?: number;
  leadTime: string; // e.g., "7-14 days"
  productionCapacity?: string;
  qualityScore: number; // 0-100
  onTimeDeliveryRate: number; // 0-100
  responseTime: string; // e.g., "< 24h"
  rating: number; // 1-5
  reviewCount: number;
  tier: ManufacturerTier;
  isVerified: boolean;
  isPremium: boolean;
  languages: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  manufacturerId: string;
  manufacturerName?: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  gallery?: string[];
  price: number;
  retailPriceEstimation: number;
  minimumOrderQuantity: number;
  stockQuantity: number;
  sku: string;
  unit: string; // e.g., "piece", "kg", "meter"
  weight?: number; // in kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch' | 'mm';
  };
  specifications: Record<string, string | number>;
  features: string[];
  tags: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  productionTime?: string;
  warranty?: string;
  compliance?: string[];
  materials?: string[];
  colors?: string[];
  sizes?: string[];
  customOptions?: {
    name: string;
    type: 'text' | 'dropdown' | 'checkbox' | 'file';
    options?: string[];
    required: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedOptions?: Record<string, string>;
  customizations?: Record<string, any>;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: Record<string, string>;
  manufacturerId: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  manufacturerId: string;
  manufacturerName: string;
  items: CartItem[];
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: "bank_transfer" | "card";
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingMethod: ShippingMethod;
  shippingAddress: Address;
  billingAddress: Address;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  customerNotes?: string;
  manufacturingNotes?: string;
  qualityCheckPassed?: boolean;
  documents?: {
    invoiceUrl?: string;
    packingListUrl?: string;
    certificateUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  history: OrderHistoryEntry[];
}

export interface OrderHistoryEntry {
  timestamp: string;
  status: OrderStatus;
  message: string;
  actor: string; // 'system' | 'customer' | 'manufacturer' | 'admin'
  metadata?: Record<string, any>;
}

export interface Complaint {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  orderId?: string;
  subject: string;
  message: string;
  status: "open" | "resolved" | "dismissed";
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'quality' | 'delivery' | 'payment' | 'communication' | 'other';
  attachments?: string[];
  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    resolutionNotes: string;
    compensationAmount?: number;
  };
  createdAt: string;
  updatedAt: string;
  messages: ComplaintMessage[];
}

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  message: string;
  attachments?: string[];
  isInternalNote: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  actionUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  orderId?: string;
  productId?: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  isSystem: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId?: string;
  manufacturerId?: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  images?: string[];
  verifiedPurchase: boolean;
  helpfulCount: number;
  reply?: {
    manufacturerId: string;
    message: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRequest {
  id: string;
  customerId: string;
  manufacturerId: string;
  productId?: string;
  productDetails?: {
    name: string;
    description: string;
    specifications: Record<string, any>;
    quantity: number;
  };
  customRequirements: string;
  requestedDeliveryDate?: string;
  status: 'pending' | 'reviewed' | 'quoted' | 'accepted' | 'rejected' | 'expired';
  quotes: Quote[];
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  quoteRequestId: string;
  manufacturerId: string;
  pricePerUnit: number;
  totalPrice: number;
  minimumOrderQuantity: number;
  leadTime: string;
  paymentTerms: string;
  shippingCost: number;
  validityPeriod: number; // days
  notes: string;
  isAccepted: boolean;
  acceptedAt?: string;
  createdAt: string;
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalManufacturers: number;
  activeManufacturers: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  monthlyGrowth: number;
  topCategories: Array<{
    category: string;
    orderCount: number;
    revenue: number;
  }>;
  topManufacturers: Array<{
    manufacturerId: string;
    manufacturerName: string;
    orderCount: number;
    rating: number;
  }>;
}

export interface ShippingQuote {
  carrier: string;
  service: string;
  cost: number;
  estimatedDays: number;
  trackingAvailable: boolean;
  insuranceAvailable: boolean;
}

export interface PaymentDetails {
  method: PaymentMethod;
  transactionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  lastFourDigits?: string;
  cardBrand?: string;
  paidAt?: string;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock';
  createdAt: string;
}

export interface QualityCheck {
  id: string;
  orderId: string;
  checkType: 'pre_shipment' | 'post_delivery' | 'random';
  status: 'pending' | 'passed' | 'failed' | 'needs_review';
  inspectorId?: string;
  inspectorName?: string;
  findings: string;
  images?: string[];
  passedAt?: string;
  createdAt: string;
}

// ===================== APP STATE TYPES =====================
export type AppView = 
  | 'marketplace'
  | 'manufacturers'
  | 'process'
  | 'manufacturer-products'
  | 'manufacturer-dashboard'
  | 'admin-dashboard'
  | 'checkout'
  | 'profile'
  | 'messages'
  | 'orders'
  | 'wishlist'
  | 'reviews'
  | 'settings'
  | 'support'
  | 'analytics';

export interface SearchFilters {
  category?: string;
  priceRange?: [number, number];
  manufacturerIds?: string[];
  rating?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ===================== RESPONSE TYPES =====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
  timestamp: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OrderSummary {
  orderId: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  manufacturerName: string;
  createdAt: string;
  estimatedDelivery?: string;
}

// ===================== FORM TYPES =====================
export interface SignUpFormData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  company?: string;
  phoneNumber?: string;
  country: string;
  acceptTerms: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface CheckoutFormData {
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  saveShippingAddress: boolean;
  saveBillingAddress: boolean;
  notes?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  retailPriceEstimation: number;
  minimumOrderQuantity: number;
  stockQuantity: number;
  imageUrl: string;
  specifications: Record<string, string | number>;
  features: string[];
  tags: string[];
  productionTime?: string;
  warranty?: string;
}

// ===================== EVENT TYPES =====================
export interface OrderEvent {
  type: 'order_created' | 'order_updated' | 'order_cancelled' | 'payment_received' | 'shipment_dispatched';
  orderId: string;
  data: any;
  timestamp: string;
}

export interface NotificationEvent {
  type: 'new_notification' | 'notification_read' | 'notification_cleared';
  notification: Notification;
  timestamp: string;
}

// ===================== CONSTANTS TYPE =====================
export interface AppConstants {
  categories: string[];
  countries: string[];
  currencies: string[];
  shippingMethods: Array<{
    value: ShippingMethod;
    label: string;
    description: string;
    price: number;
    estimatedDays: number;
  }>;
  paymentMethods: Array<{
    value: PaymentMethod;
    label: string;
    description: string;
    icon: string;
  }>;
  industries: string[];
  productStatuses: Array<{
    value: ProductStatus;
    label: string;
    color: string;
  }>;
}