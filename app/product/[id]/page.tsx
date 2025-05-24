"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, Share2, MessageCircle, ShoppingBag, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ProductDetails = {
  id: string
  title: string
  description: string
  price: number
  size: string
  condition: string
  status: string
  quantity: number
  created_at: string
  category: {
    name: string
    slug: string
  }
  seller: {
    id: string
    username: string
    avatar_url: string | null
  }
  images: {
    id: string
    image_url: string
    is_primary: boolean
  }[]
  is_favorited: boolean
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const productId = params.id
  const { user } = useAuth()
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [purchaseStatus, setPurchaseStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        // Fetch product details
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, 
            title, 
            description, 
            price, 
            size, 
            condition,
            status,
            quantity,
            created_at,
            seller_id,
            category_id
          `)
          .eq("id", productId)
          .single()

        if (error) throw error

        // Fetch seller details separately
        const { data: sellerData, error: sellerError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", data.seller_id)
          .single()

        if (sellerError) throw sellerError

        // Fetch category details separately
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("name, slug")
          .eq("id", data.category_id)
          .single()

        if (categoryError) throw categoryError

        // Fetch product images separately
        const { data: imagesData, error: imagesError } = await supabase
          .from("product_images")
          .select("id, image_url, is_primary")
          .eq("product_id", data.id)

        if (imagesError) throw imagesError

        // Check if product is favorited by current user
        let isFavorited = false
        if (user) {
          const { data: favoriteData, error: favoriteError } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("product_id", productId)
            .maybeSingle()

          if (!favoriteError) {
            isFavorited = !!favoriteData
          }
        }

        // Format the data
        const formattedProduct = {
          id: data.id,
          title: data.title,
          description: data.description,
          price: data.price,
          size: data.size,
          condition: data.condition,
          status: data.status,
          quantity: data.quantity || 1,
          created_at: data.created_at,
          category: {
            name: categoryData.name,
            slug: categoryData.slug,
          },
          seller: {
            id: sellerData.id,
            username: sellerData.username,
            avatar_url: sellerData.avatar_url,
          },
          images: imagesData || [],
          is_favorited: isFavorited,
        }

        setProduct(formattedProduct)

        // Set active image to primary image or first image
        const primaryImage = imagesData?.find((img) => img.is_primary)
        if (primaryImage) {
          setActiveImage(primaryImage.image_url)
        } else if (imagesData?.length > 0) {
          setActiveImage(imagesData[0].image_url)
        }
      } catch (error) {
        console.error("Error fetching product details:", error)
        setError("Failed to load product details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductDetails()
  }, [productId, user])

  const toggleFavorite = async () => {
    if (!user || !product) return

    try {
      if (product.is_favorited) {
        // Remove from favorites
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", product.id)
      } else {
        // Add to favorites
        await supabase.from("favorites").insert({
          user_id: user.id,
          product_id: product.id,
        })
      }

      // Update local state
      setProduct({
        ...product,
        is_favorited: !product.is_favorited,
      })
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const handleBuyNow = () => {
    if (!user) {
      router.push("/login")
      return
    }

    // Redirect to checkout page
    router.push(`/checkout/${product.id}`)
  }

  const handleMessageSeller = () => {
    if (!user) {
      router.push("/login")
      return
    }

    // Redirect to messages page with seller info
    router.push(`/messages?seller=${product?.seller.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading product details...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">{error || "Product not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CategoryNav />

      <div className="max-w-4xl mx-auto p-6 w-full">
        <div className="mb-6">
          <Link href="/browse" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to browsing
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
              {activeImage ? (
                <Image src={activeImage || "/placeholder.svg"} alt={product.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No image available</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image) => (
                  <button
                    key={image.id}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden relative ${
                      activeImage === image.image_url ? "ring-2 ring-black" : ""
                    }`}
                    onClick={() => setActiveImage(image.image_url)}
                  >
                    <Image
                      src={image.image_url || "/placeholder.svg"}
                      alt={`Product image`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {purchaseStatus === "success" && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertDescription>Purchase successful! Redirecting to dashboard...</AlertDescription>
              </Alert>
            )}

            {purchaseStatus === "error" && (
              <Alert variant="destructive">
                <AlertDescription>There was an error processing your purchase. Please try again.</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <div>
                <h1 className="text-2xl font-bold">{product.title}</h1>
                <p className="text-xl font-bold mt-1">${product.price.toFixed(2)}</p>
                {product.quantity > 1 && <p className="text-sm text-green-600 mt-1">{product.quantity} available</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={product.is_favorited ? "text-red-500" : ""}
                >
                  <Heart className="h-5 w-5" fill={product.is_favorited ? "currentColor" : "none"} />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={product.seller.avatar_url || "/placeholder.svg?text=U"} />
                <AvatarFallback>{product.seller.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/profile/${product.seller.username}`} className="font-medium hover:underline">
                  @{product.seller.username}
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Size {product.size}</Badge>
              <Link href={`/category/${product.category.slug}`}>
                <Badge variant="outline" className="hover:bg-gray-100 cursor-pointer">
                  {product.category.name}
                </Badge>
              </Link>
              <Badge variant="outline">{product.condition}</Badge>
            </div>

            <Tabs defaultValue="details">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
                <TabsTrigger value="seller">Seller</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="text-sm space-y-4 mt-4">
                <p>{product.description}</p>
              </TabsContent>
              <TabsContent value="shipping" className="text-sm space-y-4 mt-4">
                <p>
                  • Ships within 1-2 business days
                  <br />• Standard shipping (3-5 days): $5.99
                  <br />• Express shipping (1-2 days): $12.99
                </p>
                <p>Returns accepted within 14 days. Buyer pays return shipping.</p>
              </TabsContent>
              <TabsContent value="seller" className="text-sm space-y-4 mt-4">
                <p>
                  @{product.seller.username} has been a member since {new Date(product.created_at).toLocaleDateString()}
                  .
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 pt-4">
              <Button
                className="flex-1"
                onClick={handleBuyNow}
                disabled={purchaseStatus === "loading" || product.status !== "active" || product.quantity < 1}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {purchaseStatus === "loading" ? "Processing..." : `Buy now • $${product.price.toFixed(2)}`}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleMessageSeller}>
                <MessageCircle className="mr-2 h-4 w-4" /> Message seller
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
