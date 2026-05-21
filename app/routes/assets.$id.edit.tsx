import type { Route } from './+types/assets.$id.edit'
import type { AssetFormValues } from '~/lib/asset.schema'
import { IconLoader2 } from '@tabler/icons-react'
import EmojiPicker from 'emoji-picker-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { redirect, useLoaderData, useNavigate, useNavigation, useSubmit } from 'react-router'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import {
  getAssetById,
  getAssetWithTags,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
  updateAsset,
} from '~/db/queries/assets'
import { assetFormSchema } from '~/lib/asset.schema'

import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
  const assetId = params.id

  const asset = await getAssetById(assetId, userId)
  if (!asset)
    throw new Response('Not Found', { status: 404 })

  const [tagIds, categories, tags, paymentTypes, paymentAccounts] = await Promise.all([
    getAssetWithTags(assetId),
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getPaymentTypesByUserId(userId),
    getPaymentAccountsByUserId(userId),
  ])

  return { asset, tagIds, categories, tags, paymentTypes, paymentAccounts }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const raw = Object.fromEntries(formData)
  const tagIds = formData.getAll('tagIds').map(String)
  const assetType = raw.assetType as 'one_time' | 'subscription'

  const baseData = {
    name: raw.name as string,
    emoji: (raw.emoji as string) || '📦',
    categoryId: raw.categoryId as string,
    assetType,
    paymentTypeId: (raw.paymentTypeId as string) || undefined,
    paymentAccountId: (raw.paymentAccountId as string) || undefined,
    tagIds,
    notes: (raw.notes as string) || undefined,
    purchasePrice: (raw.purchasePrice as string) || undefined,
    currentValue: (raw.currentValue as string) || undefined,
    purchaseDate: (raw.purchaseDate as string) || undefined,
    subscriptionPrice: (raw.subscriptionPrice as string) || undefined,
    billingCycle: (raw.billingCycle as 'monthly' | 'quarterly' | 'yearly') || undefined,
    nextRenewalDate: (raw.nextRenewalDate as string) || undefined,
    subscriptionStartDate: (raw.subscriptionStartDate as string) || undefined,
  }

  const parsed = assetFormSchema.safeParse(baseData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const data = parsed.data
  await updateAsset(params.id, user.id, {
    name: data.name,
    emoji: data.emoji,
    categoryId: data.categoryId,
    assetType: data.assetType,
    paymentTypeId: data.paymentTypeId,
    paymentAccountId: data.paymentAccountId,
    notes: data.notes,
    tagIds: data.tagIds,
    purchasePrice: data.purchasePrice,
    currentValue: data.currentValue,
    purchaseDate: data.purchaseDate,
    subscriptionPrice: data.subscriptionPrice,
    billingCycle: data.billingCycle,
    nextRenewalDate: data.nextRenewalDate,
    subscriptionStartDate: data.subscriptionStartDate,
  })

  return redirect(`/assets/${params.id}`, { headers })
}

export default function AssetsEdit() {
  const { asset, tagIds, categories, tags, paymentTypes, paymentAccounts } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const submit = useSubmit()
  const isSubmitting = navigation.state === 'submitting'

  const [isSubscription, setIsSubscription] = useState(asset.assetType === 'subscription')
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState(asset.paymentTypeId || '')
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState(asset.paymentAccountId || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(tagIds)
  const [selectedEmoji, setSelectedEmoji] = useState(asset.emoji)
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
      name: asset.name,
      emoji: asset.emoji,
      categoryId: asset.categoryId || '',
      assetType: asset.assetType,
      tagIds,
      notes: asset.notes || '',
      paymentTypeId: asset.paymentTypeId || '',
      paymentAccountId: asset.paymentAccountId || '',
      purchasePrice: asset.purchasePrice || '',
      currentValue: asset.currentValue || '',
      purchaseDate: asset.purchaseDate || '',
      subscriptionPrice: asset.subscriptionPrice || '',
      billingCycle: asset.billingCycle || undefined,
      nextRenewalDate: asset.nextRenewalDate || '',
      subscriptionStartDate: asset.subscriptionStartDate || '',
    },
  })

  function onSubmit(data: AssetFormValues) {
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

    submit(fd, { method: 'post' })
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

  return (
    <div>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between py-3"
        style={{ background: 'var(--color-canvas)' }}
      >
        <button
          onClick={() => navigate(`/assets/${asset.id}`)}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          ‹ 返回
        </button>
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          编辑资产
        </span>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex items-center gap-1 text-sm font-medium disabled:opacity-50"
          style={{ color: 'var(--color-primary)' }}
        >
          {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
          {isSubmitting ? '保存中' : '保存'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
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
            borderColor: errors.name ? 'var(--color-error)' : undefined,
          }}
          type="text"
          {...register('name')}
        />
        {errors.name && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.name.message}</p>}

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
              borderColor: errors.categoryId ? 'var(--color-error)' : undefined,
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
        {errors.categoryId && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.categoryId.message}</p>}

        {/* Subscription toggle */}
        <div className="mb-3 mt-2 flex items-center justify-between py-2">
          <span className="text-[14px]" style={{ color: 'var(--color-ink)' }}>订阅资产</span>
          <Switch
            checked={isSubscription}
            onCheckedChange={handleSubscriptionToggle}
          />
        </div>

        {!isSubscription
          ? (
              <>
                <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>购入价 *</Label>
                <Input
                  className="mb-1"
                  style={{ borderColor: errors.purchasePrice ? 'var(--color-error)' : undefined }}
                  type="number"
                  step="0.01"
                  {...register('purchasePrice')}
                />
                {errors.purchasePrice && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.purchasePrice.message}</p>}

                <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>当前估价</Label>
                <Input
                  className="mb-3"
                  type="number"
                  step="0.01"
                  {...register('currentValue')}
                />

                <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>购入日期 *</Label>
                <Input
                  className="mb-3"
                  style={{ borderColor: errors.purchaseDate ? 'var(--color-error)' : undefined }}
                  type="date"
                  {...register('purchaseDate')}
                />
                {errors.purchaseDate && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.purchaseDate.message}</p>}
              </>
            )
          : (
              <>
                <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>订阅价 *</Label>
                <Input
                  className="mb-1"
                  style={{ borderColor: errors.subscriptionPrice ? 'var(--color-error)' : undefined }}
                  type="number"
                  step="0.01"
                  {...register('subscriptionPrice')}
                />
                {errors.subscriptionPrice && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.subscriptionPrice.message}</p>}

                <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>订阅周期 *</Label>
                <Select
                  onValueChange={(v) => {
                    if (v)
                      setValue('billingCycle', v as 'monthly' | 'quarterly' | 'yearly')
                  }}
                >
                  <SelectTrigger
                    className="mb-1 w-full"
                    style={{ borderColor: errors.billingCycle ? 'var(--color-error)' : undefined }}
                  >
                    <SelectValue placeholder="请选择周期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月付</SelectItem>
                    <SelectItem value="quarterly">季付</SelectItem>
                    <SelectItem value="yearly">年付</SelectItem>
                  </SelectContent>
                </Select>
                {errors.billingCycle && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.billingCycle.message}</p>}

                <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>下次续费日期 *</Label>
                <Input
                  className="mb-1"
                  style={{ borderColor: errors.nextRenewalDate ? 'var(--color-error)' : undefined }}
                  type="date"
                  {...register('nextRenewalDate')}
                />
                {errors.nextRenewalDate && <p className="mb-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{errors.nextRenewalDate.message}</p>}

                <Label className="mb-1.5 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>订阅开始日期</Label>
                <Input
                  className="mb-3"
                  type="date"
                  {...register('subscriptionStartDate')}
                />
              </>
            )}

        {/* Payment type + account */}
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>支付类型</Label>
            <Select
              value={selectedPaymentTypeId || undefined}
              onValueChange={(v) => {
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
              onValueChange={(v) => {
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
          保存资产
        </button>
      </form>
    </div>
  )
}
