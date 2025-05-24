"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "lucide-react"

type Sale = {
  id: string
  created_at: string
  status: string
  total_amount: number
  commission_amount: number
  seller_payout: number
  product: {
    id: string
    title: string
    images: {
      image_url: string
    }[]
  }
  buyer: {
    username: string
  }
}

export default function SalesPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSales = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id,
            created_at,
            status,
            total_amount,
            commission_amount,
            seller_payout,
            products:product_id (
              id,
              title,
              product_images (image_url)
            ),
            profiles:buyer_id (username)
          `)
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        // Format the data
        const formattedSales = data.map((sale) => ({
          id: sale.id,
          created_at: sale.created_at,
          status: sale.status,
          total_amount: Number.parseFloat(sale.total_amount) || 0,
          commission_amount: Number.parseFloat(sale.commission_amount) || 0,
          seller_payout: Number.parseFloat(sale.seller_payout) || 0,
          product: {
            id: sale.products.id,
            title: sale.products.title,
            images: sale.products.product_images,
          },
          buyer: {
            username: sale.profiles.username,
          },
        }))

        setSales(formattedSales)

        // Calculate total earnings (what the seller receives after commission)
        const totalPayout = data.reduce((sum, sale) => sum + (Number.parseFloat(sale.seller_payout) || 0), 0)
        setTotalEarnings(totalPayout)

        // Calculate total commission paid
        const commission = data.reduce((sum, sale) => sum + (Number.parseFloat(sale.commission_amount) || 0), 0)
        setTotalCommission(commission)
      } catch (error) {
        console.error("Error fetching sales:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSales()
  }, [user])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case "paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Shipped</Badge>
      case "delivered":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Delivered</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

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

          <h1 className="text-3xl font-bold mb-8">Sales Summary</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center">
                  Your Earnings
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[200px] text-xs">
                          This is the amount you receive after the 7.5% marketplace fee is deducted
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center">
                  Marketplace Fee
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[200px] text-xs">
                          A 7.5% fee is applied to all sales to support the Looped marketplace
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${totalCommission.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{sales.length}</p>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-xl font-bold mb-4">Recent Sales</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading sales data...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">You haven't made any sales yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-40 h-40 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                    {sale.product.images && sale.product.images.length > 0 ? (
                      <Image
                        src={sale.product.images[0].image_url || "/placeholder.svg"}
                        alt={sale.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <Link href={`/product/${sale.product.id}`} className="text-lg font-medium hover:underline">
                          {sale.product.title}
                        </Link>
                        <p className="text-gray-500 text-sm">
                          Sold on {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500 text-sm">Buyer: @{sale.buyer.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${sale.total_amount.toFixed(2)}</p>
                        <div className="text-sm text-gray-500 mt-1">
                          <p>Fee: -${sale.commission_amount.toFixed(2)}</p>
                          <p className="font-medium text-green-600">You earn: ${sale.seller_payout.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">{getStatusBadge(sale.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
