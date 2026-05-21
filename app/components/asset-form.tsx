import type { AssetFormValues } from '~/lib/asset.schema'
import { IconLoader2 } from '@tabler/icons-react'
import EmojiPicker from 'emoji-picker-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useNavigation } from 'react-router'
import { Button } from '~/components/ui/button'
import { DatePicker } from '~/components/ui/date-picker'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'

interface Category {
  id: string
  name: string
  emoji: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface PaymentType {
  id: string
  name: string
}

interface PaymentAccount {
  id: string
  name: string
  paymentTypeId: string | null
}

interface AssetFormProps {
  categories: Category[]
  tags: Tag[]
  paymentTypes: PaymentType[]
  paymentAccounts: PaymentAccount[]
  defaultValues?: Partial<AssetFormValues>
  showSubscriptionToggle?: boolean
  submitLabel?: string
  backLabel?: string
  backTo?: string
  title?: string
  purchasePriceLabel?: string
  hideOneTimeFields?: boolean
  onAssetTypeChange?: (isSubscription: boolean) => void
  errors?: Record<string, string[]>
  onSubmit: (fd: FormData) => void
  topContent?: React.ReactNode
  children?: React.ReactNode
}

export function AssetForm({
  categories,
  tags,
  paymentTypes,
  paymentAccounts,
  defaultValues,
  showSubscriptionToggle = true,
  submitLabel = '保存资产',
  backLabel = '‹ 返回',
  backTo,
  title,
  purchasePriceLabel = '购入价 *',
  hideOneTimeFields = false,
  onAssetTypeChange,
  errors: serverErrors,
  onSubmit,
  topContent,
  children,
}: AssetFormProps) {
  const navigate = useNavigate()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const [isSubscription, setIsSubscription] = useState(defaultValues?.assetType === 'subscription')
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<string | null>(defaultValues?.paymentTypeId || null)
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<string | null>(defaultValues?.paymentAccountId || null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(defaultValues?.categoryId || null)
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<AssetFormValues['billingCycle'] | null>(defaultValues?.billingCycle || null)
  const [selectedPurchaseDate, setSelectedPurchaseDate] = useState(defaultValues?.purchaseDate || '')
  const [selectedNextRenewalDate, setSelectedNextRenewalDate] = useState(defaultValues?.nextRenewalDate || '')
  const [selectedSubscriptionStartDate, setSelectedSubscriptionStartDate] = useState(defaultValues?.subscriptionStartDate || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultValues?.tagIds || [])
  const [selectedEmoji, setSelectedEmoji] = useState(defaultValues?.emoji || '📦')
  const [emojiOpen, setEmojiOpen] = useState(false)

  const filteredAccounts = selectedPaymentTypeId
    ? paymentAccounts.filter(a => a.paymentTypeId === selectedPaymentTypeId)
    : paymentAccounts

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AssetFormValues>({
    defaultValues: {
      name: defaultValues?.name || '',
      emoji: defaultValues?.emoji || '📦',
      categoryId: defaultValues?.categoryId || '',
      assetType: defaultValues?.assetType || 'one_time',
      tagIds: defaultValues?.tagIds || [],
      notes: defaultValues?.notes || '',
      paymentTypeId: defaultValues?.paymentTypeId || '',
      paymentAccountId: defaultValues?.paymentAccountId || '',
      purchasePrice: defaultValues?.purchasePrice || '',
      currentValue: defaultValues?.currentValue || '',
      purchaseDate: defaultValues?.purchaseDate || '',
      subscriptionPrice: defaultValues?.subscriptionPrice || '',
      billingCycle: defaultValues?.billingCycle || undefined,
      nextRenewalDate: defaultValues?.nextRenewalDate || '',
      subscriptionStartDate: defaultValues?.subscriptionStartDate || '',
    },
  })

  function handleFormSubmit(data: AssetFormValues) {
    const fd = new FormData()
    fd.append('assetType', data.assetType)
    fd.append('name', data.name)
    fd.append('emoji', selectedEmoji)
    fd.append('categoryId', data.categoryId)
    if (selectedPaymentTypeId)
      fd.append('paymentTypeId', selectedPaymentTypeId)
    if (selectedPaymentAccountId)
      fd.append('paymentAccountId', selectedPaymentAccountId)
    if (data.notes)
      fd.append('notes', data.notes)
    selectedTags.forEach(id => fd.append('tagIds', id))

    if (data.assetType === 'one_time') {
      fd.append('purchasePrice', data.purchasePrice || '')
      if (data.currentValue)
        fd.append('currentValue', data.currentValue)
      fd.append('purchaseDate', data.purchaseDate || '')
    }
    else {
      fd.append('subscriptionPrice', data.subscriptionPrice || '')
      fd.append('billingCycle', data.billingCycle || '')
      fd.append('nextRenewalDate', data.nextRenewalDate || '')
      if (data.subscriptionStartDate)
        fd.append('subscriptionStartDate', data.subscriptionStartDate)
    }

    onSubmit(fd)
  }

  function handleSubscriptionToggle(checked: boolean) {
    setIsSubscription(checked)
    setValue('assetType', checked ? 'subscription' : 'one_time')
    onAssetTypeChange?.(checked)
  }

  useEffect(() => {
    onAssetTypeChange?.(isSubscription)
  }, [isSubscription, onAssetTypeChange])

  function toggleTag(id: string) {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    )
  }

  const fieldError = (field: string) => {
    const clientErr = errors[field as keyof typeof errors]?.message
    const serverErr = serverErrors?.[field]?.[0]
    return clientErr || serverErr
  }

  return (
    <div>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between py-3"
        style={{ background: 'var(--color-canvas)' }}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => backTo && navigate(backTo)}
          className="h-9 px-2 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          {backLabel}
        </Button>
        {title && (
          <span className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
            {title}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
          className="h-9 gap-1 px-2 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
          {isSubmitting ? '保存中' : '保存'}
        </Button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {topContent && <div className="mb-3">{topContent}</div>}

        {/* Emoji */}
        <div className="flex flex-col items-center py-4 pb-6">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger
              className="flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-lg text-[30px] transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-primary-muted)' }}
            >
              {selectedEmoji}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setSelectedEmoji(emojiData.emoji)
                  setEmojiOpen(false)
                }}
                width={320}
                height={380}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Name */}
        <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
          名称 *
        </Label>
        <Input
          className="mb-1"
          style={{
            borderColor: fieldError('name') ? 'var(--color-error)' : undefined,
          }}
          type="text"
          placeholder="例：MacBook Pro"
          {...register('name')}
        />
        {fieldError('name') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('name')}</p>}

        {/* Category */}
        <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
          分类 *
        </Label>
        <Select
          value={selectedCategoryId}
          items={categories.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))}
          onValueChange={(v: string | null) => {
            if (v) {
              setSelectedCategoryId(v)
              setValue('categoryId', v)
            }
          }}
        >
          <SelectTrigger
            className="mb-1 w-full"
            style={{
              borderColor: fieldError('categoryId') ? 'var(--color-error)' : undefined,
            }}
          >
            <SelectValue placeholder="请选择分类" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.emoji}
                {' '}
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError('categoryId') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('categoryId')}</p>}

        {/* Subscription toggle */}
        {showSubscriptionToggle && (
          <div className="mb-3 mt-2 flex items-center justify-between py-2">
            <span className="text-[14px]" style={{ color: 'var(--color-ink)' }}>订阅资产</span>
            <Switch
              checked={isSubscription}
              onCheckedChange={handleSubscriptionToggle}
            />
          </div>
        )}

        {!isSubscription && !hideOneTimeFields && (
          <>
            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>{purchasePriceLabel}</Label>
            <Input
              className="mb-1"
              style={{ borderColor: fieldError('purchasePrice') ? 'var(--color-error)' : undefined }}
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('purchasePrice')}
            />
            {fieldError('purchasePrice') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('purchasePrice')}</p>}

            <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>当前估价</Label>
            <Input
              className="mb-3"
              type="number"
              step="0.01"
              placeholder="可选，留空默认等于购入价"
              {...register('currentValue')}
            />

            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>购入日期 *</Label>
            <input type="hidden" {...register('purchaseDate')} value={selectedPurchaseDate} />
            <DatePicker
              className="mb-3"
              value={selectedPurchaseDate}
              onChange={(v) => {
                setSelectedPurchaseDate(v)
                setValue('purchaseDate', v)
              }}
            />
            {fieldError('purchaseDate') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('purchaseDate')}</p>}
          </>
        )}

        {isSubscription && (
          <>
            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>订阅价 *</Label>
            <Input
              className="mb-1"
              style={{ borderColor: fieldError('subscriptionPrice') ? 'var(--color-error)' : undefined }}
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('subscriptionPrice')}
            />
            {fieldError('subscriptionPrice') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('subscriptionPrice')}</p>}

            <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>订阅周期 *</Label>
            <Select
              value={selectedBillingCycle}
              items={[
                { value: 'monthly', label: '月付' },
                { value: 'quarterly', label: '季付' },
                { value: 'yearly', label: '年付' },
              ]}
              onValueChange={(v: string | null) => {
                if (v) {
                  const cycle = v as 'monthly' | 'quarterly' | 'yearly'
                  setSelectedBillingCycle(cycle)
                  setValue('billingCycle', v as 'monthly' | 'quarterly' | 'yearly')
                }
              }}
            >
              <SelectTrigger
                className="mb-1 w-full"
                style={{ borderColor: fieldError('billingCycle') ? 'var(--color-error)' : undefined }}
              >
                <SelectValue placeholder="请选择周期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">月付</SelectItem>
                <SelectItem value="quarterly">季付</SelectItem>
                <SelectItem value="yearly">年付</SelectItem>
              </SelectContent>
            </Select>
            {fieldError('billingCycle') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('billingCycle')}</p>}

            <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>下次续费日期 *</Label>
            <input type="hidden" {...register('nextRenewalDate')} value={selectedNextRenewalDate} />
            <DatePicker
              className="mb-1"
              value={selectedNextRenewalDate}
              onChange={(v) => {
                setSelectedNextRenewalDate(v)
                setValue('nextRenewalDate', v)
              }}
            />
            {fieldError('nextRenewalDate') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('nextRenewalDate')}</p>}

            <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>订阅开始日期</Label>
            <input type="hidden" {...register('subscriptionStartDate')} value={selectedSubscriptionStartDate} />
            <DatePicker
              className="mb-3"
              value={selectedSubscriptionStartDate}
              onChange={(v) => {
                setSelectedSubscriptionStartDate(v)
                setValue('subscriptionStartDate', v)
              }}
            />
          </>
        )}

        {children}

        {/* Payment type + account */}
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>支付类型</Label>
            <Select
              value={selectedPaymentTypeId}
              items={paymentTypes.map(p => ({ value: p.id, label: p.name }))}
              onValueChange={(v: string | null) => {
                const val = v || null
                setSelectedPaymentTypeId(val)
                setValue('paymentTypeId', val || '')
                setSelectedPaymentAccountId(null)
                setValue('paymentAccountId', '')
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="可选" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>支付账户</Label>
            <Select
              value={selectedPaymentAccountId}
              items={filteredAccounts.map(a => ({ value: a.id, label: a.name }))}
              onValueChange={(v: string | null) => {
                const val = v || null
                setSelectedPaymentAccountId(val)
                setValue('paymentAccountId', val || '')
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="可选" />
              </SelectTrigger>
              <SelectContent>
                {filteredAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>标签</Label>
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map(tag => (
            <Button
              key={tag.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleTag(tag.id)}
              className="h-8 rounded-full px-3 text-[13px] font-medium"
              style={{
                background: selectedTags.includes(tag.id) ? `${tag.color}22` : 'var(--color-surface-strong)',
                color: selectedTags.includes(tag.id) ? tag.color : 'var(--color-body)',
                border: `1px solid ${selectedTags.includes(tag.id) ? tag.color : 'transparent'}`,
              }}
            >
              {tag.name}
            </Button>
          ))}
        </div>

        {/* Notes */}
        <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>备注</Label>
        <Textarea
          className="mb-6 resize-y"
          placeholder="可选备注..."
          {...register('notes')}
        />

        {/* Save button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="sticky bottom-4 mb-6 flex w-full items-center justify-center gap-2 text-[15px] font-semibold"
        >
          {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </div>
  )
}
