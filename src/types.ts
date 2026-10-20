export interface Variant {
  id: string;
  color: string;
  size: string;
  stock: number;
  sku: string;
}

export type ProductVariant = Variant;

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  description: string;
  variants: Variant[];
  discount: string | null;
  status: string;
  imageUrl?: string | null;
  category?: string | null;
}

export interface OrderItem {
  productId?: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  merchantId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: 'CONFIRMED' | 'PENDING' | string;
  paymentMethod: string;
  shippingAddress: string;
  status: 'confirmed' | 'pending' | 'cancelled' | string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface StoreSettings {
  slug: string;
  storeName: string;
  brandName?: string;
  description: string;
  logoUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  coverUrl: string;
  deliveryInfo: string;
  paymentInstructions: string;
  isPublished: boolean;
}

export interface MarketplaceStore {
  slug: string;
  storeName: string;
  brandName?: string;
  description: string;
  logoUrl?: string;
  coverUrl?: string;
  deliveryInfo?: string;
  productCount: number;
  products: Product[];
}

export interface MarketplaceResponse {
  stores: MarketplaceStore[];
  totalStores: number;
  totalProducts: number;
}

export interface AiConfig {
  enabled: boolean;
  preferredLanguage: string;
  replyStyle: string;
  customInstructions: string;
  salesBehavior: {
    greeting: string;
    responseLength: string;
    emojiPreference: string;
    productRecommendation: string;
    followUp: string;
    salesApproach: string;
    discountBehavior: string;
    uncertainPolicy: string;
  };
  humanHandoff: {
    enabled: boolean;
    triggerOnUncertain: boolean;
    triggerOnComplaint: boolean;
    triggerOnHumanRequest: boolean;
    notificationChannel: string;
  };
  schemaVersion?: number;
  updatedAt?: string;
}

export interface SampleReply {
  id: string;
  merchantId?: string;
  customerMessage: string;
  preferredReply: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'customer' | 'ai' | 'human_staff';
  senderName?: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  merchantId: string;
  platform: 'messenger' | 'tiktok';
  customerName: string;
  customerPhone?: string;
  status: 'ai_handling' | 'needs_human_review' | 'human_handling' | 'resolved';
  humanReviewReason?: string;
  aiPaused?: boolean;
  messages: ConversationMessage[];
  lastMessagePreview?: string;
  lastActivityAt: string;
  unreadCount?: number;
  relatedProductId?: string;
}

export interface AuditLog {
  id: string;
  merchantId: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface DashboardSummary {
  todaySalesAmount: number;
  todayConfirmedOrdersCount: number;
  totalOrdersCount: number;
  ordersByStatus: {
    confirmed: number;
    pending: number;
    cancelled: number;
  };
  paymentsToReviewCount: number;
  paymentsToReviewAmount: number;
  confirmedPaymentsCount: number;
  confirmedPaymentsAmount: number;
  totalActiveProducts: number;
  totalStockUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
  needsHumanReviewCount: number;
  salesComparison: null;
  profit: null;
}

export interface ProviderStatus {
  google: boolean;
  facebook: boolean;
  tiktok: boolean;
  googleCallbackUrl?: string;
  facebookRedirectUri?: string;
  tiktokRedirectUri?: string;
}

export interface AiHealth {
  provider: 'groq';
  configured: boolean;
  status: 'operational' | 'configuration_missing';
  model: string;
  lastCheck: string;
}

export type NavigationDestination = 'home' | 'messages' | 'inventory' | 'ai' | 'profile' | 'lab';

export interface TestLabMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'sending' | 'success' | 'error';
  latencyMs?: number;
  catalogMode?: 'real' | 'empty';
  errorDetails?: string;
  httpStatus?: number;
}

export interface TestLabStatus {
  status: string;
  provider: string;
  model: string;
  configured: boolean;
  merchantId: string;
  shopName: string;
  realCatalogCount: number;
  sampleCount: number;
  timestamp: string;
}
