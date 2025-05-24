"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import ImageUpload from "@/components/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { validateCardNumber, validateExpiryDate, validateCVV, getCardType } from "@/lib/payment-utils"

// Define hardcoded categories as a fallback
const FALLBACK_CATEGORIES = [
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

export default function SellPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [isSeedingCategories, setIsSeedingCategories] = useState(false)
  const [activeTab, setActiveTab] = useState("item-details")

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [size, setSize] = useState("")
  const [condition, setCondition] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Payment details state
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardholderName, setCardholderName] = useState("")
  const [savePaymentInfo, setSavePaymentInfo] = useState(true)

  // Payment validation states
  const [cardNumberError, setCardNumberError] = useState<string | null>(null)
  const [expiryError, setExpiryError] = useState<string | null>(null)
  const [cvvError, setCvvError] = useState<string | null>(null)
  const [cardType, setCardType] = useState<string>("Unknown")

  // Check if user has a profile and create one if not
  useEffect(() => {
    const checkAndCreateProfile = async () => {
      if (!user) return

      setIsCheckingProfile(true)
      try {
        console.log("Checking if user has a profile...")
        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, payment_details")
          .eq("id", user.id)
          .maybeSingle() // Use maybeSingle instead of single to avoid error if no profile exists

        if (profileError) {
          console.error("Error checking profile:", profileError)
          throw profileError
        }

        if (!profile) {
          console.log("User doesn't have a profile, creating one...")
          // Get user metadata for username
          const {
            data: { user: userData },
            error: authError,
          } = await supabase.auth.getUser()

          if (authError) {
            console.error("Error getting user data:", authError)
            throw authError
          }

          // Create a profile for the user
          const username = userData?.user_metadata?.username || `user_${Math.random().toString(36).substring(2, 10)}`

          // First check if username already exists to avoid unique constraint violation
          const { data: existingUsername, error: usernameError } = await supabase
            .from("profiles")
            .select("username")
            .eq("username", username)
            .maybeSingle()

          if (usernameError) {
            console.error("Error checking username:", usernameError)
          }

          // If username exists, make it unique by adding a random suffix
          const finalUsername = existingUsername
            ? `${username}_${Math.random().toString(36).substring(2, 6)}`
            : username

          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            username: finalUsername,
            full_name: "",
            avatar_url: "",
            bio: "",
            payment_details: null,
          })

          if (insertError) {
            // If the error is not a duplicate key error, throw it
            if (!insertError.message.includes("duplicate key")) {
              console.error("Error creating profile:", insertError)
              throw insertError
            } else {
              console.log("Profile already exists, skipping creation")
            }
          } else {
            console.log("Profile created successfully")
          }
        } else {
          console.log("User already has a profile")

          // If user has saved payment details, pre-fill the form
          if (profile.payment_details) {
            const paymentDetails = profile.payment_details as any
            if (paymentDetails.cardholderName) setCardholderName(paymentDetails.cardholderName)
            // We don't pre-fill sensitive card information for security reasons
          }
        }
      } catch (error) {
        console.error("Error in checkAndCreateProfile:", error)
        setError("There was an error with your account. Please try again or contact support.")
      } finally {
        setIsCheckingProfile(false)
      }
    }

    checkAndCreateProfile()
  }, [user])

  // Seed categories directly in the component
  const seedCategories = async () => {
    setIsSeedingCategories(true)
    try {
      console.log("Seeding categories directly...")

      // Check if categories already exist
      const { data: existingCategories, error: checkError } = await supabase.from("categories").select("id").limit(1)

      if (checkError) {
        console.error("Error checking existing categories:", checkError)
        throw checkError
      }

      if (existingCategories && existingCategories.length > 0) {
        console.log("Categories already exist, skipping seeding")
        return
      }

      // Seed categories
      const categoriesToSeed = [
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

      const { data, error: insertError } = await supabase.from("categories").insert(categoriesToSeed).select()

      if (insertError) {
        console.error("Error inserting categories:", insertError)
        throw insertError
      }

      console.log("Categories seeded successfully:", data)
      return data
    } catch (error) {
      console.error("Error seeding categories:", error)
      throw error
    } finally {
      setIsSeedingCategories(false)
    }
  }

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        console.log("Fetching categories...")
        // First try to fetch existing categories
        const { data, error } = await supabase.from("categories").select("id, name, slug").order("name")

        if (error) {
          console.error("Error fetching categories:", error)
          throw error
        }

        console.log("Categories data:", data)

        if (data && data.length > 0) {
          setCategories(data)
          console.log("Categories set from database:", data)
        } else {
          console.log("No categories found, seeding categories...")
          try {
            // Seed categories directly
            const seededCategories = await seedCategories()

            if (seededCategories && seededCategories.length > 0) {
              setCategories(seededCategories)
              console.log("Categories set after direct seeding:", seededCategories)
            } else {
              // Fetch categories again after seeding
              const { data: newData, error: newError } = await supabase
                .from("categories")
                .select("id, name, slug")
                .order("name")

              if (newError) {
                console.error("Error fetching categories after seeding:", newError)
                throw newError
              }

              console.log("Categories after seeding:", newData)
              if (newData && newData.length > 0) {
                setCategories(newData)
                console.log("Categories set after seeding:", newData)
              } else {
                // If still no categories, use fallback
                console.log("Using fallback categories")
                setCategories(FALLBACK_CATEGORIES)
              }
            }
          } catch (seedError) {
            console.error("Error seeding categories:", seedError)
            // Use fallback categories
            setCategories(FALLBACK_CATEGORIES)
            console.log("Using fallback categories due to error")
          }
        }
      } catch (error) {
        console.error("Error in fetchCategories:", error)
        // Use fallback categories
        setCategories(FALLBACK_CATEGORIES)
        console.log("Using fallback categories due to error")
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
    console.log("Categories after setting:", categories)
  }, [])

  useEffect(() => {
    console.log("Categories state updated:", categories)
  }, [categories])

  // Format and validate card details
  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "")

    // Add space after every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ")

    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.slice(0, 19)
  }

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "")

    // Format as MM/YY
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`
    }

    return digits
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardNumber(e.target.value)
    setCardNumber(formattedValue)
    setCardNumberError(null)

    // Identify card type
    setCardType(getCardType(formattedValue))

    // Validate on blur or when card number is complete
    if (formattedValue.replace(/\s/g, "").length >= 16) {
      if (!validateCardNumber(formattedValue)) {
        setCardNumberError("Invalid card number")
      }
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatExpiryDate(e.target.value)
    setCardExpiry(formattedValue)
    setExpiryError(null)

    // Validate when complete
    if (formattedValue.length === 5) {
      if (!validateExpiryDate(formattedValue)) {
        setExpiryError("Invalid or expired date")
      }
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4)
    setCardCvc(value)
    setCvvError(null)

    // Validate when complete
    if (value.length >= 3) {
      if (!validateCVV(value)) {
        setCvvError("Invalid CVV")
      }
    }
  }

  const validatePaymentDetails = (): boolean => {
    let isValid = true

    // Validate card number
    if (!validateCardNumber(cardNumber)) {
      setCardNumberError("Invalid card number")
      isValid = false
    }

    // Validate expiry date
    if (!validateExpiryDate(cardExpiry)) {
      setExpiryError("Invalid or expired date")
      isValid = false
    }

    // Validate CVV
    if (!validateCVV(cardCvc)) {
      setCvvError("Invalid CVV")
      isValid = false
    }

    // Validate cardholder name
    if (!cardholderName.trim()) {
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to list an item")
      return
    }

    if (!categoryId) {
      setError("Please select a category")
      return
    }

    // Validate payment details
    if (!validatePaymentDetails()) {
      setError("Please provide valid payment details")
      setActiveTab("payment-details")
      return
    }

    setIsSubmitting(true)
    setError(null)

    console.log("Submitting form with values:", {
      title,
      description,
      price,
      categoryId,
      size,
      condition,
      quantity,
      userId: user?.id,
      imageUrl,
    })

    try {
      // Double-check that the user has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("Error checking profile before submission:", profileError)
        throw new Error("Your profile could not be found. Please try logging out and back in.")
      }

      // Verify that the selected category exists
      const categoryIdNum = Number.parseInt(categoryId)
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryIdNum)
        .single()

      if (categoryError) {
        console.error("Error verifying category:", categoryError)

        // If category doesn't exist, try to create it using the fallback data
        const fallbackCategory = FALLBACK_CATEGORIES.find((cat) => cat.id === categoryIdNum)

        if (fallbackCategory) {
          console.log("Category not found, creating it from fallback data:", fallbackCategory)

          const { data: newCategory, error: insertError } = await supabase
            .from("categories")
            .insert({
              id: fallbackCategory.id,
              name: fallbackCategory.name,
              slug: fallbackCategory.name.toLowerCase(),
            })
            .select()
            .single()

          if (insertError) {
            console.error("Error creating category:", insertError)
            throw new Error("The selected category is not available. Please select a different category.")
          }

          console.log("Category created successfully:", newCategory)
        } else {
          throw new Error("The selected category is not available. Please select a different category.")
        }
      }

      // Save payment details if requested
      if (savePaymentInfo) {
        const paymentDetails = {
          cardholderName,
          cardType,
          lastFourDigits: cardNumber.replace(/\s/g, "").slice(-4),
          expiryDate: cardExpiry,
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ payment_details: paymentDetails })
          .eq("id", user.id)

        if (updateError) {
          console.error("Error saving payment details:", updateError)
          // Continue with listing even if payment details save fails
        }
      }

      // Insert product
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          title,
          description,
          price: Number.parseFloat(price),
          size,
          condition,
          seller_id: user.id,
          category_id: categoryIdNum,
          status: "active",
          quantity: Number.parseInt(quantity),
        })
        .select()
        .single()

      if (productError) throw productError

      // Add the product image
      const imageUrlToUse = imageUrl || `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(title)}`

      try {
        const { error: imageError } = await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: imageUrlToUse,
          is_primary: true,
        })

        if (imageError) {
          console.error("Error adding product image:", imageError)
        }
      } catch (placeholderError) {
        console.error("Error adding product image:", placeholderError)
      }

      setSuccess(true)

      // Redirect to dashboard after successful listing
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (error: any) {
      console.error("Error listing product:", error)
      setError(error.message || "An error occurred while listing your item")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingProfile) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <CategoryNav />
          <div className="flex-1 flex items-center justify-center">
            <p>Setting up your account...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />

        <div className="max-w-4xl mx-auto p-6 w-full">
          <h1 className="text-3xl font-bold mb-8">List an item for sale</h1>

          <Card>
            <CardHeader>
              <CardTitle>Item details</CardTitle>
              <CardDescription>Provide details about the item you want to sell</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>
                    Your item has been listed successfully! Redirecting to dashboard...
                  </AlertDescription>
                </Alert>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="item-details">Item Details</TabsTrigger>
                  <TabsTrigger value="payment-details">Payment Details</TabsTrigger>
                </TabsList>

                <TabsContent value="item-details">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="e.g. Vintage Denim Jacket"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your item, including condition, size, fit, etc."
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        {isLoadingCategories || isSeedingCategories ? (
                          <div className="h-10 flex items-center px-3 border rounded-md bg-gray-50">
                            {isSeedingCategories ? "Setting up categories..." : "Loading categories..."}
                          </div>
                        ) : (
                          <>
                            <Select value={categoryId} onValueChange={(value) => setCategoryId(value)}>
                              <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {categories.length === 0 && (
                              <p className="text-xs text-red-500 mt-1">
                                No categories available. Please refresh the page.
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Select value={size} onValueChange={(value) => setSize(value)}>
                          <SelectTrigger id="size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XS">XS</SelectItem>
                            <SelectItem value="S">S</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="XL">XL</SelectItem>
                            <SelectItem value="XXL">XXL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="condition">Condition</Label>
                        <Select value={condition} onValueChange={(value) => setCondition(value)}>
                          <SelectTrigger id="condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New with tags">New with tags</SelectItem>
                            <SelectItem value="Like new">Like new</SelectItem>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Well worn">Well worn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max="100"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Product Image</Label>
                      <ImageUpload onImageUploaded={(url) => setImageUrl(url)} />
                    </div>

                    <Button type="button" className="w-full" onClick={() => setActiveTab("payment-details")}>
                      Continue to Payment Details
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="payment-details">
                  <div className="space-y-6">
                    <Alert className="mb-6 bg-blue-50 text-blue-800 border-blue-200">
                      <AlertDescription>
                        Your payment details are required to list items. This information will be securely stored.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        placeholder="John Doe"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        {cardType !== "Unknown" && (
                          <span className="text-sm font-medium text-gray-500">{cardType}</span>
                        )}
                      </div>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        required
                        className={cardNumberError ? "border-red-500" : ""}
                      />
                      {cardNumberError && <p className="text-sm text-red-500">{cardNumberError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">Expiry Date</Label>
                        <Input
                          id="cardExpiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          maxLength={5}
                          required
                          className={expiryError ? "border-red-500" : ""}
                        />
                        {expiryError && <p className="text-sm text-red-500">{expiryError}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvc">CVC</Label>
                        <Input
                          id="cardCvc"
                          placeholder="123"
                          value={cardCvc}
                          onChange={handleCvvChange}
                          maxLength={4}
                          required
                          className={cvvError ? "border-red-500" : ""}
                        />
                        {cvvError && <p className="text-sm text-red-500">{cvvError}</p>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="savePaymentInfo"
                        checked={savePaymentInfo}
                        onChange={(e) => setSavePaymentInfo(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <Label htmlFor="savePaymentInfo" className="text-sm">
                        Save payment information for future listings
                      </Label>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/2"
                        onClick={() => setActiveTab("item-details")}
                      >
                        Back to Item Details
                      </Button>
                      <Button
                        type="button"
                        className="w-1/2"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoadingCategories || isSeedingCategories}
                      >
                        {isSubmitting ? "Listing item..." : "List item for sale"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
