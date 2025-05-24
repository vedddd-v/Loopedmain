"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, ArrowRight, Package, CreditCard } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type OrderDetails = {
  id: string
  created_at: string
  total_amount: number
  status: string
  quantity: number
  shipping_address: {
    name: string
    email: string
    address: string
    street_address?: string
    city: string
    state?: string
    postal_code: string
    country: string
  } | null
  product: {
    title: string
    price: number
  }
  seller: {
    username: string
  }
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const transactionId = searchParams.get("transactionId")
  const { user } = useAuth()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!user || !orderId) return

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id, 
            created_at, 
            status,
            total_amount,
            quantity,
            shipping_address,
            products:product_id (title, price),
            profiles:seller_id (username)
          `)
          .eq("id", orderId)
          .eq("buyer_id", user.id)
          .single()

        if (error) throw error

        setOrder({
          id: data.id,
          created_at: data.created_at,
          status: data.status,
          total_amount: data.total_amount,
          quantity: data.quantity || 1,
          shipping_address: data.shipping_address,
          product: {
            title: data.products.title,
            price: data.products.price,
          },
          seller: {
            username: data.profiles.username,
          },
        })
      } catch (error) {
        console.error("Error fetching order details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderDetails()
  }, [orderId, user])

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-3xl mx-auto p-6 w-full flex-1 flex flex-col items-center justify-center">
        <Card className="w-full">
          <CardContent className="p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Thank You for Your Purchase!</h1>
              <p className="text-gray-500">Your order has been successfully placed and payment has been processed.</p>
              {transactionId && (
                <p className="mt-2 text-sm bg-green-50 text-green-800 p-2 rounded inline-block">
                  Transaction ID: <span className="font-mono font-medium">{transactionId}</span>
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading order details...</p>
              </div>
            ) : order ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="font-semibold text-lg">Order #{order.id.substring(0, 8)}</h2>
                      <p className="text-gray-500 text-sm">Placed on {formatDate(order.created_at)}</p>
                    </div>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {order.status === "paid" ? "Payment Successful" : order.status}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <h3 className="font-medium">Item Purchased</h3>
                        <p>
                          {order.product.title} {order.quantity > 1 ? `(Qty: ${order.quantity})` : ""}
                        </p>
                        <p className="text-gray-500 text-sm">Seller: @{order.seller.username}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <h3 className="font-medium">Payment Details</h3>
                        <p>
                          Total Charged: <span className="font-bold">${order.total_amount.toFixed(2)}</span>
                        </p>
                        <p className="text-gray-500 text-sm">
                          Item Price: ${order.product.price.toFixed(2)}{" "}
                          {order.quantity > 1 ? `× ${order.quantity}` : ""}
                        </p>
                        <p className="text-gray-500 text-sm">Shipping: $5.99</p>
                        <p className="text-gray-500 text-sm">
                          Tax: ${(order.total_amount - order.product.price * order.quantity - 5.99).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {order.shipping_address && (
                      <div className="flex items-start gap-3">
                        <svg
                          className="h-5 w-5 text-gray-400 mt-0.5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <div>
                          <h3 className="font-medium">Shipping Address</h3>
                          <p>{order.shipping_address.name}</p>
                          <p>{order.shipping_address.street_address || order.shipping_address.address}</p>
                          <p>
                            {order.shipping_address.city}, {order.shipping_address.state || ""}{" "}
                            {order.shipping_address.postal_code}
                          </p>
                          <p>{order.shipping_address.country}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                  <p>
                    We've sent a confirmation email to your email address. The seller has been notified and will ship
                    your item soon. You can track your order in your dashboard.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild>
                    <Link href="/dashboard">View Your Orders</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/browse">
                      Continue Shopping <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-500">Order details not found</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
