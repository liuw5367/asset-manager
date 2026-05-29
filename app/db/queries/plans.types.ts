import currency from 'currency.js'

export type PlanPermission = 'own' | 'all'
export type PlanMemberRole = 'owner' | 'editor'
export type PlanItemType = 'income' | 'expense'
export type PlanMode = 'accumulate' | 'snapshot'

export interface PlanMemberView {
  userId: string
  role: PlanMemberRole
  note: string
  displayName: string
  avatarEmoji: string
}

export interface PlanDefaultItemView {
  id: string
  name: string
  itemType: PlanItemType
  sortOrder: number
}

export interface PlanRecordItemView {
  id: string
  memberId: string
  itemType: PlanItemType
  name: string
  amount: number
  updatedAt: Date | null
}

export interface PlanRecordMemberNoteView {
  id: string
  memberId: string
  note: string
  updatedAt: Date | null
  memberName?: string
  memberEmoji?: string
}

export interface PlanRecordView {
  id: string
  year: number
  month: number
  createdAt: Date | null
  updatedAt: Date | null
  recordedTotalValue: number | null
  totalIncome: number
  totalExpense: number
  netIncome: number
  totalValue: number
  items: PlanRecordItemView[]
  memberNotes: PlanRecordMemberNoteView[]
}

export interface PlanSummaryView {
  id: string
  name: string
  emoji: string
  planMode: PlanMode
  permission: PlanPermission
  members: PlanMemberView[]
  latestNetIncome: number
  latestMonth: string
}

export interface PlanDetailView {
  id: string
  ownerId: string
  name: string
  emoji: string
  planMode: PlanMode
  permission: PlanPermission
  startingValue: number
  members: PlanMemberView[]
  defaultItems: PlanDefaultItemView[]
  records: PlanRecordView[]
  trend: Array<{ month: string, label: string, amount: number }>
  canManage: boolean
  canEditAllItems: boolean
}

export interface SavePlanInput {
  planId?: string
  userId: string
  name: string
  emoji: string
  planMode: PlanMode
  permission: PlanPermission
  startingValue: string
  members: Array<{ userId: string, role: PlanMemberRole, note?: string }>
  defaultItems: Array<{ id?: string, name: string, itemType: PlanItemType, sortOrder: number }>
}

interface PlanRecordPatchInputBase {
  planId: string
  userId: string
  mode: PlanMode
  year: number
  month: number
  expectedRecordUpdatedAt?: string
  addedItems: Array<{ memberId: string, itemType: PlanItemType, name: string, amount: string }>
  updatedItems: Array<{ id: string, memberId: string, name: string, amount: string, expectedUpdatedAt?: string }>
  deletedItems: Array<{ id: string, expectedUpdatedAt?: string }>
  memberNotes: Array<{ memberId: string, note: string, expectedUpdatedAt?: string }>
}

export type PlanRecordPatchInput = PlanRecordPatchInputBase

export interface SavePlanRecordResult {
  recordId: string
  monthKey: string
}

export interface ImportPlanSnapshotMonthlyValue {
  memberEmail: string
  itemName: string
  amount: string
}

export interface ImportPlanSnapshotMonthlyRow {
  year: number
  month: number
  note?: string
  values: ImportPlanSnapshotMonthlyValue[]
}

export interface ImportPlanSnapshotHistoryInput {
  planId: string
  userId: string
  rows: ImportPlanSnapshotMonthlyRow[]
}

export interface ImportPlanSnapshotHistoryResult {
  insertedMonths: number
  skippedDuplicateMonths: number
  skippedExistingMonths: number
}

export interface AcceptInviteResult {
  planId: string
  joined: boolean
}

export function toAmount(value: string | number | null | undefined) {
  return currency(value ?? 0).value
}

export function normalizeName(name: string) {
  return name.trim()
}

export function formatMonthLabel(year: number, month: number) {
  return `${year}年${month}月`
}

export function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function buildMemberDisplayName(displayName: string | null, email: string | null) {
  return displayName?.trim() || email?.trim() || '成员'
}
