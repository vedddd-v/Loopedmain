"use client"

import { useState, useEffect, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, Shield } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

export default function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [hasAdminAccess, setHasAdminAccess] = useState(false)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setHasAdminAccess(false)
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
      }
    }

    checkAdminAccess()
  }, [user])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="border-b py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          looped
        </Link>

        <form onSubmit={handleSearch} className="relative w-full max-w-md mx-4">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search the loop..."
            className="w-full rounded-full border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-6">
          <Link href="/cart" aria-label="Shopping cart">
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {user ? (
            <>
              <Link href="/sell" className="font-medium">
                Sell
              </Link>
              <Link href="/dashboard" className="font-medium">
                Dashboard
              </Link>
              {hasAdminAccess && (
                <Link href="/admin" className="font-medium flex items-center text-blue-600">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              )}
              <Button variant="ghost" onClick={() => signOut()}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/sell" className="font-medium">
                Sell
              </Link>
              <Link href="/signup" className="font-medium">
                Sign up
              </Link>
              <Link href="/login" className="font-medium">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
