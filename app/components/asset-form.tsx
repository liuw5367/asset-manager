import type { AssetFormValues } from '~/lib/asset.schema'
import { IconLoader2 } from '@tabler/icons-react'
import EmojiPicker from 'emoji-picker-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useNavigation } from 'react-router'
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
  errors?: Record<string, string[]>
  onSubmit: (fd: FormData) => void
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
  errors: serverErrors,
  onSubmit,
  children,
}: AssetFormProps) {
  const navigate = useNavigate()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const [isSubscription, setIsSubscription] = useState(defaultValues?.assetType === 'subscription')
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState(defaultValues?.paymentTypeId || '')
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState(defaultValues?.paymentAccountId || '')
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
  }

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
        <button
          onClick={() => backTo && navigate(backTo)}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          {backLabel}
        </button>
        {title && (
          <span className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
            {title}
          </span>
        )}
        <button
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
          className="flex items-center gap-1 text-sm font-medium disabled:opacity-50"
          style={{ color: 'var(--color-primary)' }}
        >
          {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
          {isSubmitting ? '保存中' : '保存'}
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
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
          onValueChange={(v: string | null) => {
            if (v)
              setValue('categoryId', v)
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

        {!isSubscription
          ? (
              <>
                <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>购入价 *</Label>
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
                <Input
                  className="mb-3"
                  style={{ borderColor: fieldError('purchaseDate') ? 'var(--color-error)' : undefined }}
                  type="date"
                  {...register('purchaseDate')}
                />
                {fieldError('purchaseDate') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('purchaseDate')}</p>}
              </>
            )
          : (
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
                  onValueChange={(v: string | null) => {
                    if (v)
                      setValue('billingCycle', v as 'monthly' | 'quarterly' | 'yearly')
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
                <Input
                  className="mb-1"
                  style={{ borderColor: fieldError('nextRenewalDate') ? 'var(--color-error)' : undefined }}
                  type="date"
                  {...register('nextRenewalDate')}
                />
                {fieldError('nextRenewalDate') && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{fieldError('nextRenewalDate')}</p>}

                <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>订阅开始日期</Label>
                <Input
                  className="mb-3"
                  type="date"
                  {...register('subscriptionStartDate')}
                />
              </>
            )}

        {children}

        {/* Payment type + account */}
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>支付类型</Label>
            <Select
              value={selectedPaymentTypeId || undefined}
              onValueChange={(v: string | null) => {
                const val = v || ''
                setSelectedPaymentTypeId(val)
                setValue('paymentTypeId', val)
                setSelectedPaymentAccountId('')
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
              value={selectedPaymentAccountId || undefined}
              onValueChange={(v: string | null) => {
                const val = v || ''
                setSelectedPaymentAccountId(val)
                setValue('paymentAccountId', val)
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
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: selectedTags.includes(tag.id) ? `${tag.color}22` : 'var(--color-surface-strong)',
                color: selectedTags.includes(tag.id) ? tag.color : 'var(--color-body)',
                border: `1px solid ${selectedTags.includes(tag.id) ? tag.color : 'transparent'}`,
              }}
            >
              {tag.name}
            </button>
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="sticky bottom-4 mb-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
          {submitLabel}
        </button>
      </form>
    </div>
  )
}
