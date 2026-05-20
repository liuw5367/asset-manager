export interface Category {
  id: string
  name: string
  emoji: string
  isPreset: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  assetCount: number
}

export interface PaymentType {
  id: string
  name: string
  isPreset: boolean
}

export interface PaymentAccount {
  id: string
  name: string
  paymentTypeId: string
}

export interface Asset {
  id: string
  name: string
  emoji: string
  categoryId: string
  assetType: 'one_time' | 'subscription'
  purchasePrice?: number
  currentValue?: number
  purchaseDate?: string
  subscriptionPrice?: number
  billingCycle?: 'monthly' | 'quarterly' | 'yearly'
  nextRenewalDate?: string
  subscriptionStartDate?: string
  subscriptionStatus?: 'active' | 'cancelled' | 'expired'
  paymentTypeId?: string
  paymentAccountId?: string
  tagIds: string[]
  notes?: string
  dailyCost: number
}

export interface Warranty {
  startDate: string
  endDate: string
  notes?: string
  status: 'active' | 'expired'
}

export interface RepairRecord {
  id: string
  date: string
  cost: number
  reason: string
  vendor: string
  result: string
  isDone: boolean
}

export interface Plan {
  id: string
  name: string
  emoji: string
  members: { letter: string, color: string, name: string, role: string }[]
  startingValue: number
  latestNetIncome: number
  latestMonth: string
  defaultItems: { name: string, type: 'income' | 'expense' }[]
}

export interface PlanRecord {
  id: string
  planId: string
  year: number
  month: number
  totalIncome: number
  totalExpense: number
  netIncome: number
  totalValue: number
  startingValue: number
  createdAt: string
  items: {
    id: string
    memberLetter: string
    memberColor: string
    type: 'income' | 'expense'
    name: string
    amount: number
  }[]
}

// --- Categories ---
export const categories: Category[] = [
  { id: 'cat-1', name: '数码设备', emoji: '💻', isPreset: true },
  { id: 'cat-2', name: '软件工具', emoji: '🔧', isPreset: true },
  { id: 'cat-3', name: '书籍', emoji: '📚', isPreset: true },
  { id: 'cat-4', name: '订阅服务', emoji: '🔄', isPreset: true },
  { id: 'cat-5', name: '摄影', emoji: '📷', isPreset: true },
  { id: 'cat-6', name: '家居物品', emoji: '🏠', isPreset: true },
  { id: 'cat-7', name: '其他', emoji: '📦', isPreset: true },
  { id: 'cat-8', name: '娱乐', emoji: '🎮', isPreset: false },
]

// --- Tags ---
export const tags: Tag[] = [
  { id: 'tag-1', name: '工作设备', color: '#cc785c', assetCount: 4 },
  { id: 'tag-2', name: '主力机', color: '#5db8a6', assetCount: 2 },
  { id: 'tag-3', name: '摄影', color: '#5db872', assetCount: 1 },
  { id: 'tag-4', name: '常用', color: '#d4a017', assetCount: 6 },
  { id: 'tag-5', name: '旅行', color: '#87867f', assetCount: 0 },
]

// --- Payment Types & Accounts ---
export const paymentTypes: PaymentType[] = [
  { id: 'pt-1', name: '信用卡', isPreset: true },
  { id: 'pt-2', name: '借记卡', isPreset: true },
  { id: 'pt-3', name: '微信支付', isPreset: true },
  { id: 'pt-4', name: '支付宝', isPreset: true },
  { id: 'pt-5', name: 'Apple Pay', isPreset: true },
  { id: 'pt-6', name: '现金', isPreset: true },
  { id: 'pt-7', name: '其他', isPreset: true },
]

export const paymentAccounts: PaymentAccount[] = [
  { id: 'pa-1', name: '工行尾号 1234', paymentTypeId: 'pt-1' },
  { id: 'pa-2', name: '招行尾号 5678', paymentTypeId: 'pt-2' },
  { id: 'pa-3', name: '微信零钱', paymentTypeId: 'pt-3' },
  { id: 'pa-4', name: '支付宝余额', paymentTypeId: 'pt-4' },
]

// --- Assets ---
export const assets: Asset[] = [
  {
    id: 'asset-1',
    name: 'MacBook Pro 16"',
    emoji: '💻',
    categoryId: 'cat-1',
    assetType: 'one_time',
    purchasePrice: 18999,
    currentValue: 15000,
    purchaseDate: '2024-08-22',
    paymentTypeId: 'pt-1',
    paymentAccountId: 'pa-1',
    tagIds: ['tag-1', 'tag-2'],
    dailyCost: 8.23,
  },
  {
    id: 'asset-2',
    name: 'Sony A7M4',
    emoji: '📷',
    categoryId: 'cat-5',
    assetType: 'one_time',
    purchasePrice: 22000,
    purchaseDate: '2024-06-15',
    paymentTypeId: 'pt-1',
    paymentAccountId: 'pa-1',
    tagIds: ['tag-1', 'tag-3'],
    dailyCost: 9.86,
  },
  {
    id: 'asset-3',
    name: 'Spotify',
    emoji: '🎵',
    categoryId: 'cat-8',
    assetType: 'subscription',
    subscriptionPrice: 168,
    billingCycle: 'yearly',
    nextRenewalDate: '2026-05-23',
    subscriptionStartDate: '2025-01-15',
    subscriptionStatus: 'active',
    paymentTypeId: 'pt-4',
    tagIds: ['tag-4'],
    notes: '家庭组共享',
    dailyCost: 0.46,
  },
  {
    id: 'asset-4',
    name: 'AirPods Pro 2',
    emoji: '🎧',
    categoryId: 'cat-1',
    assetType: 'one_time',
    purchasePrice: 1899,
    purchaseDate: '2024-12-01',
    paymentTypeId: 'pt-4',
    tagIds: ['tag-4'],
    dailyCost: 3.12,
  },
  {
    id: 'asset-5',
    name: 'Notion',
    emoji: '⌨️',
    categoryId: 'cat-2',
    assetType: 'subscription',
    subscriptionPrice: 648,
    billingCycle: 'yearly',
    nextRenewalDate: '2026-09-10',
    subscriptionStartDate: '2025-09-10',
    subscriptionStatus: 'active',
    paymentTypeId: 'pt-1',
    tagIds: ['tag-4'],
    dailyCost: 1.78,
  },
  {
    id: 'asset-6',
    name: 'iPhone 16 Pro',
    emoji: '📱',
    categoryId: 'cat-1',
    assetType: 'one_time',
    purchasePrice: 8999,
    purchaseDate: '2025-09-20',
    paymentTypeId: 'pt-1',
    paymentAccountId: 'pa-1',
    tagIds: ['tag-1'],
    dailyCost: 6.85,
  },
  {
    id: 'asset-7',
    name: '设计心理学（套装）',
    emoji: '📚',
    categoryId: 'cat-3',
    assetType: 'one_time',
    purchasePrice: 256,
    purchaseDate: '2026-04-10',
    paymentTypeId: 'pt-4',
    tagIds: [],
    dailyCost: 0,
  },
  {
    id: 'asset-8',
    name: 'iCloud+ 2TB',
    emoji: '☁️',
    categoryId: 'cat-2',
    assetType: 'subscription',
    subscriptionPrice: 68,
    billingCycle: 'monthly',
    nextRenewalDate: '2026-06-20',
    subscriptionStartDate: '2025-05-20',
    subscriptionStatus: 'active',
    paymentTypeId: 'pt-5',
    tagIds: ['tag-4'],
    dailyCost: 2.27,
  },
  {
    id: 'asset-9',
    name: 'JetBrains 全家桶',
    emoji: '💻',
    categoryId: 'cat-2',
    assetType: 'subscription',
    subscriptionPrice: 1988,
    billingCycle: 'yearly',
    nextRenewalDate: '2026-06-01',
    subscriptionStartDate: '2024-06-01',
    subscriptionStatus: 'active',
    paymentTypeId: 'pt-1',
    tagIds: ['tag-1', 'tag-4'],
    dailyCost: 5.45,
  },
]

// --- Asset Detail (mock) ---
export const assetDetail = {
  warranty: {
    startDate: '2024-08-22',
    endDate: '2026-08-21',
    notes: 'Apple 原厂保修',
    status: 'active' as const,
  },
  repairRecords: [
    {
      id: 'rr-1',
      date: '2025-08-10',
      cost: 200,
      reason: '屏幕进灰清理',
      vendor: 'Apple Store',
      result: '已完成',
      isDone: true,
    },
    {
      id: 'rr-2',
      date: '2025-03-15',
      cost: 0,
      reason: '键盘个别键失灵',
      vendor: '授权维修点',
      result: '已完成',
      isDone: true,
    },
  ] as RepairRecord[],
  subscriptionDetail: {
    billingCycle: 'monthly' as const,
    price: 68,
    dailyCost: 2.27,
    nextRenewalDate: '2026-06-20',
    totalRenewals: 12,
    totalAmount: 816,
    status: 'active' as const,
  },
}

// --- Plans ---
export const plans: Plan[] = [
  {
    id: 'plan-1',
    name: '家庭月度计划',
    emoji: '💰',
    members: [
      { letter: 'W', color: '#cc785c', name: '我', role: 'owner' },
      { letter: 'L', color: '#5db8a6', name: '伴侣', role: 'editor' },
      { letter: 'Z', color: '#d4a017', name: '室友', role: 'editor' },
    ],
    startingValue: 42000,
    latestNetIncome: 47800,
    latestMonth: '2026年4月',
    defaultItems: [
      { name: '工资', type: 'income' },
      { name: '房租', type: 'expense' },
      { name: '基金收益', type: 'income' },
      { name: '生活费', type: 'expense' },
    ],
  },
  {
    id: 'plan-2',
    name: '个人计划',
    emoji: '📊',
    members: [
      { letter: 'A', color: '#cc785c', name: '我', role: 'owner' },
    ],
    startingValue: 0,
    latestNetIncome: 22000,
    latestMonth: '2026年4月',
    defaultItems: [
      { name: '工资', type: 'income' },
      { name: '生活费', type: 'expense' },
    ],
  },
]

// --- Plan Records ---
export const planRecords: PlanRecord[] = [
  {
    id: 'pr-1',
    planId: 'plan-1',
    year: 2026,
    month: 5,
    totalIncome: 50000,
    totalExpense: 3500,
    netIncome: 46500,
    totalValue: 88500,
    startingValue: 42000,
    createdAt: '2026-05-20T14:30:00',
    items: [
      { id: 'pri-1', memberLetter: 'A', memberColor: '#cc785c', type: 'income', name: '工资', amount: 20000 },
      { id: 'pri-2', memberLetter: 'A', memberColor: '#cc785c', type: 'income', name: '奖金', amount: 5000 },
      { id: 'pri-3', memberLetter: 'B', memberColor: '#5db8a6', type: 'income', name: '基金收益', amount: 3200 },
      { id: 'pri-4', memberLetter: 'C', memberColor: '#d4a017', type: 'income', name: '兼职收入', amount: 21800 },
      { id: 'pri-5', memberLetter: 'A', memberColor: '#cc785c', type: 'expense', name: '房租', amount: 2500 },
      { id: 'pri-6', memberLetter: 'B', memberColor: '#5db8a6', type: 'expense', name: '生活费', amount: 1000 },
    ],
  },
  {
    id: 'pr-2',
    planId: 'plan-1',
    year: 2026,
    month: 4,
    totalIncome: 52000,
    totalExpense: 4200,
    netIncome: 47800,
    totalValue: 89800,
    startingValue: 42000,
    createdAt: '2026-04-28T10:00:00',
    items: [],
  },
  {
    id: 'pr-3',
    planId: 'plan-1',
    year: 2026,
    month: 3,
    totalIncome: 48500,
    totalExpense: 2900,
    netIncome: 45600,
    totalValue: 87600,
    startingValue: 42000,
    createdAt: '2026-03-30T15:00:00',
    items: [],
  },
]

// --- Helpers ---
export function getCategoryById(id: string) {
  return categories.find(c => c.id === id)
}

export function getTagById(id: string) {
  return tags.find(t => t.id === id)
}

export function getPaymentTypeById(id: string) {
  return paymentTypes.find(p => p.id === id)
}

export function getPaymentAccountById(id: string) {
  return paymentAccounts.find(p => p.id === id)
}

export function getAssetById(id: string) {
  return assets.find(a => a.id === id)
}

export function getPlanById(id: string) {
  return plans.find(p => p.id === id)
}

export function getPlanRecords(planId: string) {
  return planRecords.filter(r => r.planId === planId)
}

export function getPlanRecord(planId: string, year: number, month: number) {
  return planRecords.find(r => r.planId === planId && r.year === year && r.month === month)
}

// --- Dashboard Mock ---
export const dashboardData = {
  dailyExpense: 28.50,
  monthlyEstimate: 855,
  yearlyEstimate: 10260,
  totalSpent: 48200,
  assetCount: 15,
  categorySpending: [
    { name: '数码设备', amount: 21800, percent: 45, color: '#cc785c' },
    { name: '软件工具', amount: 13500, percent: 28, color: '#5db8a6' },
    { name: '订阅服务', amount: 7230, percent: 15, color: '#5db872' },
    { name: '书籍', amount: 3860, percent: 8, color: '#d4a017' },
    { name: '其他', amount: 1810, percent: 4, color: '#6c6a64' },
  ],
  trendData: [720, 810, 690, 850, 780, 920, 860, 790, 880, 855, 910, 855],
  trendLabels: ['6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月'],
  expiring: [
    { id: 'asset-3', emoji: '🎵', name: 'Netflix', detail: '订阅 · 5月23日到期（3天后）' },
    { id: 'asset-9', emoji: '💻', name: 'JetBrains 全家桶', detail: '订阅 · 6月1日到期（12天后）' },
    { id: 'asset-1', emoji: '📷', name: 'Sony A7M4', detail: '保修 · 6月10日到期（21天后）' },
  ],
}
