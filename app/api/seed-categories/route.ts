import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Check if categories already exist
    const { data: existingCategories, error: checkError } = await supabase.from("categories").select("count")

    if (checkError) {
      console.error("Error checking existing categories:", checkError)
      throw checkError
    }

    console.log("Existing categories check:", existingCategories)

    if (existingCategories && existingCategories.length > 0) {
      return NextResponse.json({ message: "Categories already seeded", count: existingCategories.length })
    }

    // Seed categories
    const categories = [
      { name: "Trending", slug: "trending" },
      { name: "Vintage", slug: "vintage" },
      { name: "Men", slug: "men" },
      { name: "Women", slug: "women" },
      { name: "Footwear", slug: "footwear" },
      { name: "Outerwear", slug: "outerwear" },
      { name: "Accessories", slug: "accessories" },
      { name: "Y2K", slug: "y2k" },
      { name: "Streetwear", slug: "streetwear" },
    ]

    console.log("Attempting to insert categories:", categories)

    const { data, error: insertError } = await supabase.from("categories").insert(categories).select()

    if (insertError) {
      console.error("Error inserting categories:", insertError)
      throw insertError
    }

    console.log("Categories inserted successfully:", data)

    return NextResponse.json({ message: "Categories seeded successfully", categories: data })
  } catch (error) {
    console.error("Error seeding categories:", error)
    return NextResponse.json({ error: "Failed to seed categories" }, { status: 500 })
  }
}
