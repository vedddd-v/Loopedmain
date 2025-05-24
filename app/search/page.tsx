"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Heart, Filter, ArrowUpDown } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"

type Product = {
  id: string
  title: string
  description: string
  price: number
  size: string
  seller: {
    username: string
  }
  images: {
    image_url: string
  }[]
  is_favorited: boolean
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalResults, setTotalResults] = useState(0)

  useEffect(() => {
    const searchProducts = async () => {
      if (!query) {
        setProducts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Search products by title and description
        const { data, error, count } = await supabase
          .from("products")
          .select(
            `
            id, 
            title, 
            description,
            price, 
            size,
            profiles!seller_id(username),
            product_images(image_url, is_primary)
          `,
            { count: "exact" },
          )
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq("status", "active")
          .order("created_at", { ascending: false })

        if (error) throw error

        setTotalResults(count || 0)

        // Format the data
        const formattedProducts = data.map((product) => ({
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          size: product.size,
          seller: {
            username: product.profiles.username,
          },
          images: product.product_images,
          is_favorited: false, // We'll check this if user is logged in
        }))

        // If user is logged in, check which products are favorited
        if (user) {
          const { data: favorites, error: favoritesError } = await supabase
            .from("favorites")
            .select("product_id")
            .eq("user_id", user.id)

          if (!favoritesError && favorites) {
            const favoritedIds = favorites.map((fav) => fav.product_id)
            formattedProducts.forEach((product) => {
              product.is_favorited = favoritedIds.includes(product.id)
            })
          }
        }

        setProducts(formattedProducts)
      } catch (error) {
        console.error("Error searching products:", error)
      } finally {
        setIsLoading(false)
      }
    }

    searchProducts()
  }, [query, user])

  const toggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()

    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/login"
      return
    }

    try {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      if (product.is_favorited) {
        // Remove from favorites
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId)
      } else {
        // Add to favorites
        await supabase.from("favorites").insert({
          user_id: user.id,
          product_id: productId,
        })
      }

      // Update local state
      setProducts(
        products.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              is_favorited: !p.is_favorited,
            }
          }
          return p
        }),
      )
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CategoryNav />

      <div className="max-w-7xl mx-auto p-6 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Search results for "{query}"</h1>
            <p className="text-gray-500">{totalResults} items found</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" /> Filter
            </Button>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" /> Sort
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <p>Searching products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No products found matching "{query}"</p>
            <Button asChild>
              <Link href="/browse">Browse all items</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="group">
                <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-2">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0].image_url || "/placeholder.svg"}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Image
                      src={`/placeholder.svg?height=400&width=300&text=No+Image`}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 bg-white/80 rounded-full h-8 w-8 ${
                      product.is_favorited ? "text-red-500" : ""
                    }`}
                    onClick={(e) => toggleFavorite(product.id, e)}
                  >
                    <Heart className="h-4 w-4" fill={product.is_favorited ? "currentColor" : "none"} />
                  </Button>
                  <div className="absolute bottom-2 left-2 bg-white/80 rounded-full px-2 py-1 text-xs">
                    {product.size}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium text-sm truncate">{product.title}</h3>
                    <p className="text-gray-500 text-xs">@{product.seller.username}</p>
                  </div>
                  <p className="font-bold">${product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
