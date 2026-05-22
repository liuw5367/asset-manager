import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // url: process.env.DATABASE_URL!,
    url: 'postgresql://postgres.xvumdxzysnfmyilysinn:Aj1FkdZE6MTYtvKa@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  },
})
