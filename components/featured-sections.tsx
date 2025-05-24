import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function FeaturedSections() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 flex-1">
      {/* Men's Section */}
      <div className="bg-gray-300 flex flex-col items-center justify-center text-center p-10">
        <h2 className="text-5xl font-bold mb-4">MEN</h2>
        <p className="text-xl mb-6">Shop our latest drops</p>
        <Button asChild variant="secondary" className="bg-white hover:bg-gray-100">
          <Link href="/category/men">Shop now</Link>
        </Button>
      </div>

      {/* Women's Section */}
      <div className="bg-gray-300 flex flex-col items-center justify-center text-center p-10">
        <h2 className="text-5xl font-bold mb-4">WOMEN</h2>
        <p className="text-xl mb-6">Fresh styles for you</p>
        <Button asChild variant="secondary" className="bg-white hover:bg-gray-100">
          <Link href="/category/women">Shop now</Link>
        </Button>
      </div>
    </div>
  )
}
