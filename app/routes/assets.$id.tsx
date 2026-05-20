import { IconChevronLeft, IconDots } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  assetDetail,
  getAssetById,
  getCategoryById,
  getPaymentAccountById,
  getPaymentTypeById,
  getTagById,
} from '~/data/mock'

export default function AssetsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const asset = getAssetById(id!)
  const [menuOpen, setMenuOpen] = useState(false)
  const [subDropdown, setSubDropdown] = useState('跟随全局（7天）')
  const [warrantyDropdown, setWarrantyDropdown] = useState('跟随全局（14天）')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-muted)' }}>
        资产未找到
      </div>
    )
  }

  const category = getCategoryById(asset.categoryId)
  const assetTags = asset.tagIds
    .map(tid => getTagById(tid))
    .filter(Boolean)
  const paymentType = asset.paymentTypeId
    ? getPaymentTypeById(asset.paymentTypeId)
    : undefined
  const paymentAccount = asset.paymentAccountId
    ? getPaymentAccountById(asset.paymentAccountId)
    : undefined

  const holdingDays = asset.purchaseDate
    ? Math.floor(
        (Date.now() - new Date(asset.purchaseDate).getTime())
        / (1000 * 60 * 60 * 24),
      )
    : 0

  const { warranty, repairRecords } = assetDetail

  const bgColors: Record<string, string> = {
    'cat-1': 'var(--color-primary-muted)',
    'cat-2': 'var(--color-primary-muted)',
    'cat-5': '#e6f4f1',
    'cat-8': '#e8f5e9',
    'cat-3': '#fef6e4',
    'cat-4': '#e8f5e9',
    'cat-6': '#f0e4dc',
    'cat-7': 'var(--color-surface-strong)',
  }

  return (
    <div>
      {/* Top bar */}
      <div
        className="flex items-center justify-between py-3"
        style={{ minHeight: 48 }}
      >
        <Link
          to="/assets"
          className="flex items-center gap-1 text-[14px] font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconChevronLeft size={18} />
          资产
        </Link>
        <div className="relative flex items-center gap-3" ref={menuRef}>
          <Link
            to={`/assets/${id}/edit`}
            className="text-[14px] font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            编辑
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-[16px] tracking-wider"
            style={{ color: 'var(--color-muted)' }}
          >
            <IconDots size={18} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl border p-1"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              <button
                className="w-full rounded-lg px-3.5 py-2.5 text-left text-[14px] transition-colors"
                style={{ color: 'var(--color-ink)' }}
                onMouseEnter={e =>
                  (e.currentTarget.style.background
                    = 'var(--color-surface-soft)')}
                onMouseLeave={e =>
                  (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/assets/${id}/trade-in`)
                }}
              >
                以旧换新
              </button>
              <button
                className="w-full rounded-lg px-3.5 py-2.5 text-left text-[14px] transition-colors"
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={e =>
                  (e.currentTarget.style.background
                    = 'var(--color-surface-soft)')}
                onMouseLeave={e =>
                  (e.currentTarget.style.background = 'transparent')}
                onClick={() => setMenuOpen(false)}
              >
                删除资产
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero section */}
      <div className="flex flex-col items-center py-4 text-center">
        <div
          className="mb-2 flex h-[60px] w-[60px] items-center justify-center rounded-xl text-[30px]"
          style={{
            background: bgColors[asset.categoryId] || 'var(--color-primary-muted)',
          }}
        >
          {asset.emoji}
        </div>
        <div className="mb-2 text-[20px] font-semibold" style={{ color: 'var(--color-ink)' }}>
          {asset.name}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {category && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={{
                background: 'var(--color-surface-strong)',
                color: 'var(--color-muted)',
              }}
            >
              {category.name}
            </span>
          )}
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
            style={{
              background:
                asset.assetType === 'subscription'
                  ? 'var(--color-info)'
                  : 'var(--color-surface-strong)',
              color: asset.assetType === 'subscription' ? '#fff' : 'var(--color-muted)',
            }}
          >
            {asset.assetType === 'subscription' ? '订阅' : '买断'}
          </span>
          {assetTags.map(
            tag =>
              tag && (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                  style={{
                    background: `${tag.color}22`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ),
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <Section title="财务摘要">
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <DetailRow
            label="购入价"
            value={asset.purchasePrice?.toLocaleString() || '—'}
          />
          <DetailRow
            label="当前估价"
            value={asset.currentValue?.toLocaleString() || '—'}
            muted
          />
          <DetailRow
            label="每日成本"
            value={`${asset.dailyCost}/天`}
            primary
          />
          <DetailRow label="持有天数" value={`${holdingDays} 天`} />
          <DetailRow
            label="支付方式"
            value={
              paymentAccount && paymentType
                ? `${paymentAccount.name} · ${paymentType.name}`
                : paymentType?.name || '—'
            }
          />
          <DetailRow label="购入日期" value={asset.purchaseDate || '—'} />
        </div>
      </Section>

      {/* Subscription detail */}
      {asset.assetType === 'subscription' && (
        <Section title="订阅信息">
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--color-surface-card)' }}
          >
            <DetailRow
              label="订阅周期"
              value={
                asset.billingCycle === 'monthly'
                  ? '月付'
                  : asset.billingCycle === 'quarterly'
                    ? '季付'
                    : '年付'
              }
            />
            <DetailRow
              label="订阅金额"
              value={`${asset.subscriptionPrice}/${
                asset.billingCycle === 'monthly'
                  ? '月'
                  : asset.billingCycle === 'quarterly'
                    ? '季'
                    : '年'
              }`}
            />
            <DetailRow
              label="每日成本"
              value={`${asset.dailyCost}/天`}
              primary
            />
            <DetailRow
              label="下次续费"
              value={asset.nextRenewalDate || '—'}
            />
            <DetailRow
              label="状态"
              value={(
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                  style={{
                    background: 'var(--color-success)',
                    color: '#fff',
                  }}
                >
                  活跃
                </span>
              )}
            />
          </div>
        </Section>
      )}

      {/* Basic Info */}
      <Section title="基础信息">
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <DetailRow
            label="分类"
            value={category ? `${category.emoji} ${category.name}` : '—'}
          />
          <DetailRow
            label="标签"
            value={
              assetTags.length > 0
                ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assetTags.map(
                        tag =>
                          tag && (
                            <span
                              key={tag.id}
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                              style={{
                                background: `${tag.color}22`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ),
                      )}
                    </div>
                  )
                : (
                    '—'
                  )
            }
          />
          <DetailRow
            label="备注"
            value={asset.notes || '—'}
            muted={!asset.notes}
          />
        </div>
      </Section>

      {/* Warranty */}
      <Section
        title="保修"
        action={(
          <button
            className="text-[14px] font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            编辑保修
          </button>
        )}
      >
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <DetailRow
            label="保修期"
            value={`${warranty.startDate} → ${warranty.endDate}`}
          />
          <DetailRow
            label="状态"
            value={(
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                style={{
                  background:
                    warranty.status === 'active'
                      ? 'var(--color-success)'
                      : 'var(--color-error)',
                  color: '#fff',
                }}
              >
                {warranty.status === 'active' ? '活跃' : '已过期'}
              </span>
            )}
          />
          <DetailRow label="备注" value={warranty.notes || '—'} />
        </div>
      </Section>

      {/* Reminder Settings */}
      <Section title="到期提醒设置">
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <DetailRow
            label="订阅到期提醒"
            value={(
              <select
                value={subDropdown}
                onChange={e => setSubDropdown(e.target.value)}
                className="h-8 rounded-lg border px-3 text-[12px] outline-none"
                style={{
                  background: 'var(--color-canvas)',
                  borderColor: 'var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              >
                <option>跟随全局（7天）</option>
                <option>1天前</option>
                <option>3天前</option>
                <option>7天前</option>
                <option>14天前</option>
                <option>关闭</option>
              </select>
            )}
          />
          <DetailRow
            label="保修到期提醒"
            value={(
              <select
                value={warrantyDropdown}
                onChange={e => setWarrantyDropdown(e.target.value)}
                className="h-8 rounded-lg border px-3 text-[12px] outline-none"
                style={{
                  background: 'var(--color-canvas)',
                  borderColor: 'var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              >
                <option>跟随全局（14天）</option>
                <option>1天前</option>
                <option>3天前</option>
                <option>7天前</option>
                <option>14天前</option>
                <option>关闭</option>
              </select>
            )}
          />
        </div>
      </Section>

      {/* Repair Records */}
      <Section
        title="维修记录"
        action={(
          <button
            className="text-[14px] font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            + 添加维修
          </button>
        )}
      >
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          {repairRecords.map((record, index) => (
            <div key={record.id} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{
                    background: record.isDone
                      ? 'var(--color-success)'
                      : 'var(--color-warning)',
                  }}
                />
                {index < repairRecords.length - 1 && (
                  <div
                    className="w-px flex-1"
                    style={{ background: 'var(--color-hairline)' }}
                  />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {record.date}
                </div>
                <div
                  className="text-[14px]"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {record.reason}
                </div>
                <div
                  className="text-[12px]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {record.vendor}
                  {' '}
                  ·
                  {' '}
                  {record.cost > 0 ? record.cost : '0（保修内）'}
                  {' '}
                  ·
                  {' '}
                  <span style={{ color: 'var(--color-success)' }}>
                    {record.result}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        className="my-4 flex items-center gap-3"
        style={{ color: 'var(--color-ink)' }}
      >
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <div
          className="h-px flex-1"
          style={{ background: 'var(--color-hairline)' }}
        />
        {action}
      </div>
      {children}
    </div>
  )
}

function DetailRow({
  label,
  value,
  muted,
  primary,
}: {
  label: string
  value: React.ReactNode
  muted?: boolean
  primary?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{
        borderBottom: '1px solid var(--color-hairline)',
      }}
    >
      <span className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
      <span
        className="text-[14px] font-medium"
        style={{
          color: primary
            ? 'var(--color-primary)'
            : muted
              ? 'var(--color-muted-soft)'
              : 'var(--color-ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
