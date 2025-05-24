"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Heart } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"

type Product = {
  id: string
  title: string
  price: number
  size: string
  quantity: number
  seller: {
    username: string
  }
  images: {
    image_url: string
  }[]
  favorites_count: number
  is_favorited: boolean
}

export default function BrowsePage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let query = supabase
          .from("products")
          .select(`
            id, 
            title, 
            price, 
            size,
            quantity,
            profiles!seller_id(username),
            product_images(image_url, is_primary)
          `)
          .eq("status", "active")
          .gt("quantity", 0)
          .order("created_at", { ascending: false })

        // If category is specified, filter by category
        if (categoryParam) {
          // First get the category ID from the slug
          const { data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", categoryParam)
            .single()

          if (!categoryError && categoryData) {
            query = query.eq("category_id", categoryData.id)
          }
        }

        const { data, error } = await query

        if (error) throw error

        // Format the data
        const formattedProducts = data.map((product) => ({
          id: product.id,
          title: product.title,
          price: product.price,
          size: product.size,
          quantity: product.quantity,
          seller: {
            username: product.profiles.username,
          },
          images: product.product_images,
          favorites_count: 0, // We'll fetch this separately
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
        console.error("Error fetching products:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [user, categoryParam])

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
              favorites_count: p.is_favorited ? p.favorites_count - 1 : p.favorites_count + 1,
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
          <h1 className="text-2xl font-bold">Browse items {categoryParam ? `in ${categoryParam}` : ""}</h1>
          <div className="flex gap-4">
            <Button variant="outline" size="sm">
              Filter
            </Button>
            <Button variant="outline" size="sm">
              Sort
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
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
                      src={`/placeholder.svg?key=xm57o&height=400&width=300&text=No+Image`}
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
                  {product.quantity > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white rounded-full px-2 py-1 text-xs">
                      {product.quantity} available
                    </div>
                  )}
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
