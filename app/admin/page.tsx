"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserRoleManager from "@/components/user-role-manager"
import RevenueChart from "@/components/revenue-chart"

type CommissionStats = {
  totalCommission: number
  totalOrders: number
  totalSales: number
  recentCommissions: {
    id: string
    created_at: string
    commission_amount: number
    total_amount: number
    product_title: string
    seller_username: string
    buyer_username: string
  }[]
  commissionByDate: {
    date: string
    amount: number
  }[]
}

// Sample data for demonstration
const SAMPLE_MODE = true // Set to false to use real data from database

const SAMPLE_STATS: CommissionStats = {
  totalCommission: 16539.42,
  totalOrders: 4593,
  totalSales: 220525.6,
  recentCommissions: [
    {
      id: "1",
      created_at: new Date().toISOString(),
      commission_amount: 37.5,
      total_amount: 500.0,
      product_title: "Premium Wireless Headphones",
      seller_username: "audiotech",
      buyer_username: "musiclover",
    },
    {
      id: "2",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      commission_amount: 22.5,
      total_amount: 300.0,
      product_title: "Vintage Leather Jacket",
      seller_username: "vintageshop",
      buyer_username: "fashionista",
    },
    {
      id: "3",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      commission_amount: 15.0,
      total_amount: 200.0,
      product_title: "Smart Home Security Camera",
      seller_username: "techgadgets",
      buyer_username: "homeowner",
    },
    {
      id: "4",
      created_at: new Date(Date.now() - 259200000).toISOString(),
      commission_amount: 45.0,
      total_amount: 600.0,
      product_title: "Professional DSLR Camera",
      seller_username: "photopro",
      buyer_username: "traveler",
    },
    {
      id: "5",
      created_at: new Date(Date.now() - 345600000).toISOString(),
      commission_amount: 30.0,
      total_amount: 400.0,
      product_title: "Handcrafted Ceramic Vase",
      seller_username: "artisancrafts",
      buyer_username: "homedecor",
    },
  ],
  commissionByDate: generateSampleCommissionData(),
}

// Generate realistic sample data for the chart
function generateSampleCommissionData() {
  const data = []
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 30) // Last 30 days

  let totalCommission = 0
  const targetCommission = 16539.42

  // Create a pattern with weekends having higher values
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Base amount varies by day of week
    let baseAmount = isWeekend
      ? Math.random() * 300 + 700
      : // $700-1000 on weekends
        Math.random() * 400 + 300 // $300-700 on weekdays

    // Add some randomness for realism
    const randomFactor = Math.random() * 0.3 + 0.85 // 0.85-1.15
    baseAmount *= randomFactor

    // Add occasional spikes
    if (Math.random() < 0.1) {
      baseAmount *= 1.5 // 10% chance of a 50% spike
    }

    data.push({
      date: new Date(d).toISOString().split("T")[0],
      amount: Math.round(baseAmount * 100) / 100,
    })

    totalCommission += baseAmount
  }

  // Scale all values to match the target total
  const scaleFactor = targetCommission / totalCommission
  return data.map((item) => ({
    date: item.date,
    amount: Math.round(item.amount * scaleFactor * 100) / 100,
  }))
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<CommissionStats>({
    totalCommission: 0,
    totalOrders: 0,
    totalSales: 0,
    recentCommissions: [],
    commissionByDate: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("30days")

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
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

  useEffect(() => {
    const fetchCommissionStats = async () => {
      if (!user || !hasAdminAccess) return

      // Use sample data if in sample mode
      if (SAMPLE_MODE) {
        setStats(SAMPLE_STATS)
        setIsLoading(false)
        return
      }

      try {
        // Get total commission amount
        const { data: commissionData, error: commissionError } = await supabase
          .from("orders")
          .select("commission_amount")

        if (commissionError) throw commissionError

        const totalCommission = commissionData.reduce(
          (sum, order) => sum + (Number.parseFloat(order.commission_amount) || 0),
          0,
        )

        // Get total orders and sales
        const { count: orderCount, error: countError } = await supabase.from("orders").select("*", { count: "exact" })

        if (countError) throw countError

        const { data: salesData, error: salesError } = await supabase.from("orders").select("total_amount")

        if (salesError) throw salesError

        const totalSales = salesData.reduce((sum, order) => sum + (Number.parseFloat(order.total_amount) || 0), 0)

        // Get commission data by date
        const startDate = new Date()
        if (timeRange === "7days") {
          startDate.setDate(startDate.getDate() - 7)
        } else if (timeRange === "30days") {
          startDate.setDate(startDate.getDate() - 30)
        } else if (timeRange === "90days") {
          startDate.setDate(startDate.getDate() - 90)
        } else if (timeRange === "year") {
          startDate.setFullYear(startDate.getFullYear() - 1)
        }

        const { data: dateData, error: dateError } = await supabase
          .from("orders")
          .select("created_at, commission_amount")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true })

        if (dateError) throw dateError

        // Group by date
        const commissionByDate = dateData.reduce(
          (acc, order) => {
            const date = new Date(order.created_at).toISOString().split("T")[0]
            const existingEntry = acc.find((entry) => entry.date === date)

            if (existingEntry) {
              existingEntry.amount += Number.parseFloat(order.commission_amount) || 0
            } else {
              acc.push({
                date,
                amount: Number.parseFloat(order.commission_amount) || 0,
              })
            }

            return acc
          },
          [] as { date: string; amount: number }[],
        )

        // Fill in missing dates with zero values
        const filledCommissionByDate = fillMissingDates(commissionByDate, startDate)

        // Get recent orders
        const { data: recentOrders, error: recentOrdersError } = await supabase
          .from("orders")
          .select(`
            id,
            created_at,
            commission_amount,
            total_amount,
            product_id,
            seller_id,
            buyer_id
          `)
          .order("created_at", { ascending: false })
          .limit(10)

        if (recentOrdersError) throw recentOrdersError

        // Get product details
        const productIds = recentOrders.map((order) => order.product_id)
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, title")
          .in("id", productIds)

        if (productsError) throw productsError

        // Get user details
        const userIds = [
          ...new Set([...recentOrders.map((order) => order.seller_id), ...recentOrders.map((order) => order.buyer_id)]),
        ]

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds)

        if (profilesError) throw profilesError

        // Create a map for quick lookups
        const productMap = products.reduce((map, product) => {
          map[product.id] = product
          return map
        }, {})

        const profileMap = profiles.reduce((map, profile) => {
          map[profile.id] = profile
          return map
        }, {})

        // Combine the data
        const formattedRecentCommissions = recentOrders.map((order) => ({
          id: order.id,
          created_at: order.created_at,
          commission_amount: Number.parseFloat(order.commission_amount) || 0,
          total_amount: Number.parseFloat(order.total_amount) || 0,
          product_title: productMap[order.product_id]?.title || "Unknown Product",
          seller_username: profileMap[order.seller_id]?.username || "Unknown Seller",
          buyer_username: profileMap[order.buyer_id]?.username || "Unknown Buyer",
        }))

        setStats({
          totalCommission,
          totalOrders: orderCount || 0,
          totalSales,
          recentCommissions: formattedRecentCommissions,
          commissionByDate: filledCommissionByDate,
        })
      } catch (error) {
        console.error("Error fetching commission stats:", error)
        setError("Failed to load commission statistics")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommissionStats()
  }, [user, hasAdminAccess, timeRange])

  // Helper function to fill in missing dates with zero values
  const fillMissingDates = (data: { date: string; amount: number }[], startDate: Date) => {
    const result = [...data]
    const dateMap = data.reduce((map, item) => {
      map[item.date] = true
      return map
    }, {})

    const endDate = new Date()
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0]

      if (!dateMap[dateStr]) {
        result.push({
          date: dateStr,
          amount: 0,
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result.sort((a, b) => a.date.localeCompare(b.date))
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />

        <div className="max-w-7xl mx-auto w-full px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          {!hasAdminAccess && user ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>You do not have permission to access this page.</AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="users">User Management</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <p>Loading statistics...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-gray-500">Total Commission Revenue</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">${stats.totalCommission.toFixed(2)}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-gray-500">Total Sales Volume</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">${stats.totalSales.toFixed(2)}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-gray-500">Total Orders</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">{stats.totalOrders.toLocaleString()}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="mb-8">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle>Commission Revenue Over Time</CardTitle>
                          <div className="flex space-x-2">
                            <select
                              value={timeRange}
                              onChange={(e) => setTimeRange(e.target.value)}
                              className="px-2 py-1 text-sm border rounded-md"
                            >
                              <option value="7days">Last 7 Days</option>
                              <option value="30days">Last 30 Days</option>
                              <option value="90days">Last 90 Days</option>
                              <option value="year">Last Year</option>
                            </select>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <RevenueChart data={stats.commissionByDate} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Commissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.recentCommissions.length === 0 ? (
                            <p className="text-center py-4 text-gray-500">No commission data available yet</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-3 px-4">Date</th>
                                    <th className="text-left py-3 px-4">Product</th>
                                    <th className="text-left py-3 px-4">Seller</th>
                                    <th className="text-left py-3 px-4">Buyer</th>
                                    <th className="text-right py-3 px-4">Sale Amount</th>
                                    <th className="text-right py-3 px-4">Commission</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stats.recentCommissions.map((commission) => (
                                    <tr key={commission.id} className="border-b hover:bg-gray-50">
                                      <td className="py-3 px-4">
                                        {new Date(commission.created_at).toLocaleDateString()}
                                      </td>
                                      <td className="py-3 px-4">{commission.product_title}</td>
                                      <td className="py-3 px-4">@{commission.seller_username}</td>
                                      <td className="py-3 px-4">@{commission.buyer_username}</td>
                                      <td className="py-3 px-4 text-right">${commission.total_amount.toFixed(2)}</td>
                                      <td className="py-3 px-4 text-right font-medium">
                                        ${commission.commission_amount.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="users">
                  <UserRoleManager />
                </TabsContent>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500">Settings functionality coming soon.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
