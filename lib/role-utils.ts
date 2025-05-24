import { createServerSupabaseClient } from "@/lib/supabase/server"

export type UserRole = "owner" | "admin"

/**
 * Check if a user has a specific role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .single()

  if (error || !data) {
    return false
  }

  return true
}

/**
 * Check if a user is an owner
 */
export async function isOwner(userId: string): Promise<boolean> {
  return hasRole(userId, "owner")
}

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "admin")
}

/**
 * Check if a user has admin access (either admin or owner)
 */
export async function hasAdminAccess(userId: string): Promise<boolean> {
  const [isUserOwner, isUserAdmin] = await Promise.all([isOwner(userId), isAdmin(userId)])

  return isUserOwner || isUserAdmin
}
