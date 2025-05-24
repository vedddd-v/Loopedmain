"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import AdminDashboardLink from "@/components/admin-dashboard-link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { user } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [listings, setListings] = useState([])
  const [sales, setTotalSales] = useState(0)
  const [favorites, setFavorites] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        // Fetch unread messages count
        const { count: messagesCount, error: messagesError } = await supabase
          .from("messages")
          .select("*", { count: "exact" })
          .eq("recipient_id", user.id)
          .eq("read", false)

        if (messagesError) throw messagesError
        setUnreadMessages(messagesCount || 0)

        // Fetch user's listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("products")
          .select("*")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })

        if (listingsError) throw listingsError
        setListings(listingsData || [])

        // Fetch sales data
        const { data: salesData, error: salesError } = await supabase
          .from("orders")
          .select("*")
          .eq("seller_id", user.id)

        if (salesError) throw salesError
        const totalAmount = salesData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
        setTotalSales(totalAmount)

        // Fetch favorites
        const { data: favoritesData, error: favoritesError } = await supabase
          .from("favorites")
          .select("*, products(*)")
          .eq("user_id", user.id)

        if (favoritesError) throw favoritesError
        setFavorites(favoritesData || [])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />

        <div className="max-w-7xl mx-auto w-full px-6 py-8">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-sm font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-8">Welcome to your dashboard.</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* New Messages */}
            <Link href="/messages">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>New Messages</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>You have {unreadMessages} unread messages.</p>
                </CardContent>
              </Card>
            </Link>

            {/* Your Listings */}
            <Link href="/listings">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Your Listings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>View and manage your listed items.</p>
                </CardContent>
              </Card>
            </Link>

            {/* Sales Summary */}
            <Link href="/sales">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Track your earnings and recent activity.</p>
                </CardContent>
              </Card>
            </Link>

            {/* Favorites */}
            <Link href="/favorites">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Favorites</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>See items you've saved for later.</p>
                </CardContent>
              </Card>
            </Link>

            {/* Admin Dashboard Link - Only shown to admins/owners */}
            <AdminDashboardLink />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
