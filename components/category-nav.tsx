"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

type Category = {
  id: number
  name: string
  slug: string
}

export default function CategoryNav() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch categories from the database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from("categories").select("id, name, slug").order("name")

        if (error) throw error

        if (data && data.length > 0) {
          setCategories(data)
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

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
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
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
