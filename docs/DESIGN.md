# Holdly — 认证页面设计规范

> 品牌规范源自 `docs/DESIGN-CLAUDE.md`（Claude 品牌体系）。Holdly 共享同一套暖色调设计语言：暖奶油色画布（`#faf9f5`）、珊瑚色主色（`#cc785c`）、暖墨色文字（`#141413`）。
>
> 基于 `holdly-prototype.html` 提取，用于指导 /login、/register、/forgot-password 页面实现。

---

## 0. 品牌基调

Holdly 的视觉系统继承自 Claude 暖色编辑风格：

- **画布**：暖奶油色 `#faf9f5`（不是纯白），整体氛围温暖、人文
- **主色**：暖珊瑚 `#cc785c`，hover 加深至 `#a9583e`
- **文字**：暖墨色 `#141413`（非纯黑），次要文字 `#3d3d3a`，弱化文字 `#6c6a64`
- **字体**：EB Garamond 衬线体做品牌展示，Inter 无衬线做正文 UI
- **深度**：色块对比为主（奶油 vs 深色卡片），不使用阴影
- **圆角**：按钮/输入框 10px，卡片 12px/16px，徽标 pill

色彩 token 参见 `DESIGN-CLAUDE.md` 的 Colors 章节，Holdly 的 `--color-*` 变量与 Claude 品牌 token 一一对应。

---

## 1. 页面布局

认证页面使用居中全屏布局，所有内容垂直居中。

```
min-height: 100dvh
display: flex
flex-direction: column
justify-content: center
align-items: center
padding: 48px 24px 32px
text-align: center
background: var(--color-canvas)
```

---

## 2. 排版层级

### 品牌名 `.brand-name`
- font-family: `var(--font-display)` (EB Garamond)
- font-size: **42px**
- font-weight: 400
- color: `var(--color-primary)` (#cc785c)
- margin-bottom: **20px**

### 标题 `.tagline`
- font-family: `var(--font-display)` (EB Garamond)
- font-size: **22px**
- font-weight: 400
- color: `var(--color-ink)` (#141413)
- line-height: 1.3
- margin-bottom: **8px**

### 副标题 `.subtitle`
- font-size: **13px**
- color: `var(--color-muted)` (#6c6a64)
- margin-bottom: **32px**
- max-width: 280px

---

## 3. 表单组 `.auth-group`

```
width: 100%
max-width: 360px
display: flex
flex-direction: column
gap: 10px        ← 注意：不是 12px
```

### 标签 `.input-label`
- display: block
- font-size: **12px**
- font-weight: 500
- color: `var(--color-muted)` (#6c6a64)
- margin-bottom: **6px**

### 输入框 `.input-field`
- width: 100%, height: **44px**
- padding: 0 **12px**
- background: `var(--color-canvas)` (#faf9f5)
- color: `var(--color-ink)` (#141413)
- border: **1px solid** `var(--color-hairline)` (#e6dfd8)
- border-radius: **10px**
- font-size: **15px**
- outline: none
- transition: border-color 0.15s, box-shadow 0.15s

**focus 状态（重要）**:
- border-color: `var(--color-primary)` (#cc785c)
- box-shadow: **0 0 0 3px** `var(--color-primary-muted)` (#f0e4dc)

**placeholder**:
- color: `var(--color-muted-soft)` (#8e8b82)

---

## 4. 按钮

### 主按钮 `.btn-primary`
```
display: inline-flex
align-items: center
justify-content: center
gap: 6px
height: 44px
padding: 12px 20px
background: var(--color-primary)    (#cc785c)
color: #fff
font-size: 15px
font-weight: 600
border-radius: 10px
border: none
cursor: pointer
width: 100%
transition: background 0.15s, transform 0.1s
```
- **hover**: `background: var(--color-primary-active)` (#a9583e)
- **active**: `transform: scale(0.98)`

### 次按钮 `.btn-secondary`
```
display: inline-flex
align-items: center
justify-content: center
gap: 8px
height: 44px
padding: 0 16px
background: var(--color-canvas)     (#faf9f5)
color: var(--color-ink)             (#141413)
font-size: 15px
font-weight: 500
border: 1px solid var(--color-hairline)  (#e6dfd8)
border-radius: 10px
cursor: pointer
width: 100%
transition: background 0.15s
```
- **hover**: `background: var(--color-surface-soft)` (#f5f0e8)

---

## 5. 分隔线 `.login-divider`

```
display: flex
align-items: center
gap: 12px
color: var(--color-muted)    (#6c6a64)
font-size: 12px
margin: 16px 0
```

- `::before` 和 `::after`: `content: ''; flex: 1; height: 1px; background: var(--color-hairline)`

---

## 6. 页脚链接 `.login-footer`

```
display: flex
gap: 24px
justify-content: center
margin-top: 20px
font-size: 14px
color: var(--color-primary)    (#cc785c)
```

- **hover**: `color: var(--color-primary-active)` (#a9583e)

---

## 7. 成功状态

注册/找回密码成功后，替换主表单区域为卡片：
- 外层：同 `.login-page` 布局
- 卡片：`background: var(--color-surface-card)`, `border-radius: 16px`, `padding: 24px`
- 标题：`font-size: 16px`, `font-weight: 600`, `color: var(--color-ink)`
- 说明：`font-size: 14px`, `color: var(--color-muted)`, `margin-top: 8px`
- 按钮：同主按钮规格，`margin-top: 16px`

---

## 8. 服务条款（仅注册页）

```
font-size: 12px
color: var(--color-muted)    (#6c6a64)
margin-top: 12px
text-align: center
```

链接：`color: var(--color-primary)`

---

## 9. CSS 变量冲突说明

`app.css` 中 `@theme` 块定义 Holdly 的 `--color-primary` 等 token。不能使用 `@theme inline` 覆盖这些变量，因为 `@theme inline` 输出在 CSS 非层级（unlayered），优先级高于 `@theme` 的 `@layer theme`，会导致 Holdly 的珊瑚色 `#cc785c` 被 shadcn 的深色覆盖。

**规则**：Holdly 的 `--color-*` token 必须在 `@theme` 中定义，且不能被其他 `@theme` 块覆盖。

---

## 10. Do / Don't

### Do
- 使用 `var(--font-display)` (EB Garamond) 做品牌名和标题
- 使用原始 HTML 元素（`<button>`, `<input>`, `<label>`），不使用 shadcn 组件
- 所有颜色使用 `--color-*` 前缀的 CSS 变量
- 输入框 focus 必须有 `box-shadow: 0 0 0 3px var(--color-primary-muted)` 光晕
- 按钮必须有 hover（颜色加深）和 active（scale 0.98）过渡动画
- 品牌规范参考 `docs/DESIGN-CLAUDE.md`

### Don't
- 不使用 shadcn 的 `Button`、`Input`、`Label` 组件
- 不使用 `--background`、`--foreground`、`--border` 等 shadcn CSS 变量
- 不使用 Tailwind 的 `font-sans` 做标题字体
- 分隔线字号不要用 13px，统一 12px
- footer 不要用 `justify-between`，用 `justify-center` + `gap: 24px`
- 不要使用 `@theme inline` 覆盖 `--color-*` token
