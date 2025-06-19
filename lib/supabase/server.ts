import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
    throw new Error("Supabase URL not configured")
  }

  if (!supabaseAnonKey) {
    console.error("Missing SUPABASE_ANON_KEY environment variable")
    throw new Error("Supabase anon key not configured")
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          console.error("Error setting cookie:", error)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options })
        } catch (error) {
          console.error("Error removing cookie:", error)
        }
      },
    },
  })
}
