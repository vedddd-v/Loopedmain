"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { Shield } from "lucide-react"

export default function AdminDashboardLink() {
  const { user } = useAuth()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setHasAdminAccess(false)
        setIsLoading(false)
        return
      }

      try {
        // Check for owner or admin role
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["owner", "admin"])
          .maybeSingle()

        setHasAdminAccess(!!data)
      } catch (error) {
        console.error("Error checking admin access:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()
  }, [user])

  if (isLoading || !hasAdminAccess) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-100">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          Admin Dashboard
        </CardTitle>
        <CardDescription>Manage your marketplace</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm">Access platform settings, user management, and view marketplace statistics.</p>
        <Link href="/admin">
          <Button>Go to Admin Dashboard</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
