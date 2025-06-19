"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type Category = {
  id: number
  name: string
  slug: string
}

// Use hardcoded categories for now to ensure the app works
const CATEGORIES: Category[] = [
  { id: 1, name: "Trending", slug: "trending" },
  { id: 2, name: "Vintage", slug: "vintage" },
  { id: 3, name: "Men", slug: "men" },
  { id: 4, name: "Women", slug: "women" },
  { id: 5, name: "Footwear", slug: "footwear" },
  { id: 6, name: "Outerwear", slug: "outerwear" },
  { id: 7, name: "Accessories", slug: "accessories" },
  { id: 8, name: "Y2K", slug: "y2k" },
  { id: 9, name: "Streetwear", slug: "streetwear" },
]

export default function CategoryNav() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories] = useState<Category[]>(CATEGORIES) // Use hardcoded categories
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false) // No loading needed for hardcoded data

  // Set active category based on URL
  useEffect(() => {
    if (pathname.startsWith("/category/")) {
      const categorySlug = pathname.split("/")[2]
      setActiveCategory(categorySlug)
    } else {
      const categoryParam = searchParams.get("category")
      if (categoryParam) {
        setActiveCategory(categoryParam)
      } else {
        setActiveCategory(null)
      }
    }
  }, [pathname, searchParams])

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug)

    // If we're on the browse page, update the query parameter
    if (pathname === "/browse") {
      router.push(`/browse?category=${slug}`)
    } else {
      router.push(`/category/${slug}`)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-stone-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 overflow-x-auto">
          <div className="flex space-x-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="w-24 h-10 bg-gray-200 rounded-full animate-pulse" />
              ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 border-b">
      <div className="max-w-7xl mx-auto px-6 py-3 overflow-x-auto">
        <div className="flex space-x-4">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === category.slug ? "bg-black text-white" : "bg-white border hover:bg-gray-50"
              }`}
              onClick={() => handleCategoryClick(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
