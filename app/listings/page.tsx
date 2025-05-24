"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Listing = {
  id: string
  title: string
  price: number
  status: string
  created_at: string
  images: {
    image_url: string
  }[]
}

export default function ListingsPage() {
  const { user } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const fetchListings = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            title,
            price,
            status,
            created_at,
            product_images (image_url, is_primary)
          `)
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        setListings(data || [])
      } catch (error) {
        console.error("Error fetching listings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [user])

  const deleteListing = async () => {
    if (!deleteId) return

    try {
      // Delete the product
      const { error } = await supabase.from("products").delete().eq("id", deleteId)

      if (error) throw error

      // Update local state
      setListings(listings.filter((listing) => listing.id !== deleteId))
      setDeleteId(null)
    } catch (error) {
      console.error("Error deleting listing:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      case "sold":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sold</Badge>
      case "deleted":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Deleted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Your Listings</h1>
            <Button asChild>
              <Link href="/sell">+ New Listing</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't listed any items yet</p>
              <Button asChild>
                <Link href="/sell">Create your first listing</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {listings.map((listing) => (
                <div key={listing.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-40 h-40 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                    {listing.images && listing.images.length > 0 ? (
                      <Image
                        src={listing.images[0].image_url || "/placeholder.svg"}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <Link href={`/product/${listing.id}`} className="text-lg font-medium hover:underline">
                          {listing.title}
                        </Link>
                        <p className="text-gray-500 text-sm">
                          Listed on {new Date(listing.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold">${listing.price}</p>
                    </div>

                    <div className="mt-2">{getStatusBadge(listing.status)}</div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/product/${listing.id}`}>View</Link>
                      </Button>
                      {listing.status === "active" && (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/edit/${listing.id}`}>
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => setDeleteId(listing.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your listing. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteListing} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  )
}
