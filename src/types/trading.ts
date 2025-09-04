// Core Trading Types for Crypto Paper Trading Platform

// Asset/Market Types
export interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdated: number;
}

export interface MarketMeta {
  universe: AssetInfo[];
}

export interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

// Price Data Types
export interface PriceData {
  [symbol: string]: string; // Price as string from API
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandleSnapshot {
  T: number[]; // timestamps
  c: number[]; // close prices
  h: number[]; // high prices
  l: number[]; // low prices
  o: number[]; // open prices
  v: number[]; // volumes
}

// Trading Types
export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled';

export interface Order {
  id: string;
  portfolioId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // undefined for market orders
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
  filledPrice?: number;
}

export interface Position {
  id: string;
  portfolioId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fee: number;
  total: number;
  timestamp: number;
  orderId?: string;
}

// Portfolio Types
export interface Portfolio {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  createdAt: number;
  updatedAt: number;
}

export interface PortfolioSummary {
  totalValue: number;
  availableBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
  positionsCount: number;
  dayPnL: number;
  dayPnLPercent: number;
}

// API Response Types
export interface HyperliquidMetaResponse {
  universe: AssetInfo[];
}

export interface HyperliquidPricesResponse {
  [symbol: string]: string;
}

export interface HyperliquidCandleResponse {
  T: number[];
  c: string[];
  h: string[];
  l: string[];
  o: string[];
  v: string[];
}

// WebSocket Types
export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'price_update' | 'error' | 'connected' | 'disconnected';
  data: any;
}

// Chart Types
export interface ChartConfig {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  theme: 'dark' | 'light';
}

export interface TechnicalIndicator {
  name: string;
  enabled: boolean;
  params?: Record<string, any>;
}

// UI State Types
export interface TradingFormData {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
}

export interface AssetListFilter {
  search: string;
  sortBy: 'name' | 'price' | 'change' | 'volume';
  sortOrder: 'asc' | 'desc';
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Utility Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TimeRange {
  start: number;
  end: number;
}

// Store Types (for Zustand)
export interface PositionStoreState {
  positions: Position[];
  transactions: Transaction[];
  orders: Order[];
  addPosition: (position: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string, closePrice: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  getPositionsByPortfolio: (portfolioId: string) => Position[];
  getTransactionsByPortfolio: (portfolioId: string) => Transaction[];
}

export interface PortfolioStoreState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  createPortfolio: (name: string) => void;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => void;
  deletePortfolio: (id: string) => void;
  setActivePortfolio: (id: string) => void;
  getActivePortfolio: () => Portfolio | null;
  calculatePortfolioValue: (portfolioId: string, positions: Position[]) => PortfolioSummary;
}

// Constants
export const INITIAL_PORTFOLIO_BALANCE = 100000;
export const DEFAULT_TRADING_FEE_PERCENT = 0.001; // 0.1%
export const PRICE_UPDATE_INTERVAL = 1000; // 1 second
export const CHART_UPDATE_INTERVAL = 60000; // 1 minute