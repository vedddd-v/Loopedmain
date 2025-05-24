import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import FeaturedSections from "@/components/featured-sections"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <CategoryNav />
      <FeaturedSections />
    </main>
  )
}
