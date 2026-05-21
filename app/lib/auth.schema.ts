import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码').min(8, '密码至少 8 位'),
})

export const registerSchema = z.object({
  displayName: z.string().min(1, '请输入昵称').max(30, '昵称最多 30 个字符'),
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码').min(8, '密码至少 8 位'),
  confirmPassword: z.string().min(1, '请确认密码'),
}).refine(data => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
