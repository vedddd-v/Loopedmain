"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
  is_favorited: boolean
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const categorySlug = params.slug
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categoryName, setCategoryName] = useState("")

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        // First get the category ID from the slug
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("slug", categorySlug)
          .single()

        if (categoryError) throw categoryError

        setCategoryName(categoryData.name)

        // Fetch products in this category
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id, 
            title, 
            price, 
            size,
            quantity,
            seller_id
          `)
          .eq("category_id", categoryData.id)
          .eq("status", "active")
          .gt("quantity", 0)
          .order("created_at", { ascending: false })

        if (productsError) throw productsError

        // Create a map to store product data
        const productMap = new Map()

        // Initialize the product map with basic product data
        productsData.forEach((product) => {
          productMap.set(product.id, {
            id: product.id,
            title: product.title,
            price: product.price,
            size: product.size,
            quantity: product.quantity,
            seller_id: product.seller_id,
            seller: {
              username: "",
            },
            images: [],
            is_favorited: false,
          })
        })

        // Get all seller IDs
        const sellerIds = productsData.map((product) => product.seller_id)

        // Fetch seller usernames in a single query
        if (sellerIds.length > 0) {
          const { data: sellersData, error: sellersError } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", sellerIds)

          if (sellersError) throw sellersError

          // Add seller usernames to the product map
          sellersData.forEach((seller) => {
            // Find all products by this seller
            productsData.forEach((product) => {
              if (product.seller_id === seller.id && productMap.has(product.id)) {
                const productData = productMap.get(product.id)
                productData.seller.username = seller.username
                productMap.set(product.id, productData)
              }
            })
          })
        }

        // Fetch product images in a single query
        const { data: imagesData, error: imagesError } = await supabase
          .from("product_images")
          .select("product_id, image_url, is_primary")
          .in(
            "product_id",
            productsData.map((p) => p.id),
          )

        if (imagesError) throw imagesError

        // Add images to the product map
        imagesData.forEach((image) => {
          if (productMap.has(image.product_id)) {
            const productData = productMap.get(image.product_id)
            productData.images.push({ image_url: image.image_url })
            productMap.set(image.product_id, productData)
          }
        })

        // If user is logged in, check which products are favorited
        if (user) {
          const { data: favorites, error: favoritesError } = await supabase
            .from("favorites")
            .select("product_id")
            .eq("user_id", user.id)
            .in(
              "product_id",
              productsData.map((p) => p.id),
            )

          if (!favoritesError && favorites) {
            const favoritedIds = favorites.map((fav) => fav.product_id)

            // Update favorited status in the product map
            favoritedIds.forEach((id) => {
              if (productMap.has(id)) {
                const productData = productMap.get(id)
                productData.is_favorited = true
                productMap.set(id, productData)
              }
            })
          }
        }

        // Convert the map to an array for state
        const formattedProducts = Array.from(productMap.values())
        setProducts(formattedProducts)
      } catch (error) {
        console.error("Error fetching category products:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoryProducts()
  }, [categorySlug, user])

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
          <h1 className="text-2xl font-bold">{categoryName || categorySlug}</h1>
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
            <p className="text-gray-500">No products found in this category</p>
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
                      src={`/placeholder.svg?key=9ai64&key=zci3x&key=8yyh3&height=400&width=300&text=No+Image`}
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
