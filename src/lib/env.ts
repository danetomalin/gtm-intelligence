import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  N8N_WEBHOOK_BASE_URL: z.string().url().optional(),
  N8N_WEBHOOK_INIT_BRAND: z.string().min(1).optional(),
  N8N_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL,
  N8N_WEBHOOK_INIT_BRAND: process.env.N8N_WEBHOOK_INIT_BRAND,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
});
