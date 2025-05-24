"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import { Button } from "@/components/ui/button"

type FavoriteProduct = {
  id: string
  product: {
    id: string
    title: string
    price: number
    size: string
    seller: {
      username: string
    }
    images: {
      image_url: string
    }[]
  }
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("favorites")
          .select(`
            id,
            product_id,
            products:product_id (
              id,
              title,
              price,
              size,
              profiles:seller_id (username),
              product_images (image_url, is_primary)
            )
          `)
          .eq("user_id", user.id)

        if (error) throw error

        // Format the data
        const formattedFavorites = data.map((fav) => ({
          id: fav.id,
          product: {
            id: fav.products.id,
            title: fav.products.title,
            price: fav.products.price,
            size: fav.products.size,
            seller: {
              username: fav.products.profiles.username,
            },
            images: fav.products.product_images,
          },
        }))

        setFavorites(formattedFavorites)
      } catch (error) {
        console.error("Error fetching favorites:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [user])

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("favorites").delete().eq("id", favoriteId)

      if (error) throw error

      // Update local state
      setFavorites(favorites.filter((fav) => fav.id !== favoriteId))
    } catch (error) {
      console.error("Error removing favorite:", error)
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

          <h1 className="text-3xl font-bold mb-8">Your Favorites</h1>

          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading favorites...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't saved any items yet</p>
              <Button asChild>
                <Link href="/browse">Browse items</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {favorites.map((favorite) => (
                <div key={favorite.id} className="group relative">
                  <Link href={`/product/${favorite.product.id}`}>
                    <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-2">
                      {favorite.product.images && favorite.product.images.length > 0 ? (
                        <Image
                          src={favorite.product.images[0].image_url || "/placeholder.svg"}
                          alt={favorite.product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Image
                          src={`/placeholder.svg?height=400&width=300&text=No+Image`}
                          alt={favorite.product.title}
                          fill
                          className="object-cover"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/80 rounded-full h-8 w-8 text-red-500"
                        onClick={(e) => {
                          e.preventDefault()
                          removeFavorite(favorite.id)
                        }}
                      >
                        <Heart className="h-4 w-4" fill="currentColor" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-white/80 rounded-full px-2 py-1 text-xs">
                        {favorite.product.size}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-sm truncate">{favorite.product.title}</h3>
                        <p className="text-gray-500 text-xs">@{favorite.product.seller.username}</p>
                      </div>
                      <p className="font-bold">${favorite.product.price}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
