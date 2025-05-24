"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CreditCard, ShieldCheck, Lock, AlertCircle, CheckCircle, Minus, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { validateCardNumber, validateExpiryDate, validateCVV, getCardType, processPayment } from "@/lib/payment-utils"
import AddressAutocomplete, { type AddressDetails } from "@/components/address-autocomplete"

type ProductDetails = {
  id: string
  title: string
  price: number
  seller_id: string
  quantity: number
  seller: {
    username: string
  }
  images: {
    image_url: string
  }[]
}

export default function CheckoutPage({ params }: { params: { productId: string } }) {
  const productId = params.productId
  const { user } = useAuth()
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentStep, setPaymentStep] = useState<"shipping" | "payment">("shipping")
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)

  // Form validation states
  const [cardNumberError, setCardNumberError] = useState<string | null>(null)
  const [expiryError, setExpiryError] = useState<string | null>(null)
  const [cvvError, setCvvError] = useState<string | null>(null)
  const [cardType, setCardType] = useState<string>("Unknown")

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [streetAddress, setStreetAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("United States")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [savePaymentInfo, setSavePaymentInfo] = useState(false)

  // Shipping cost and tax calculation
  const shippingCost = 5.99
  const taxRate = 0.08 // 8% tax rate
  const commissionRate = 0.075 // 7.5% commission

  const calculateCommission = (subtotal: number) => {
    return subtotal * commissionRate
  }

  const calculateTax = (price: number, quantity: number) => {
    return price * quantity * taxRate
  }

  const calculateSubtotal = (price: number, quantity: number) => {
    return price * quantity
  }

  const calculateTotal = (price: number, quantity: number) => {
    return calculateSubtotal(price, quantity) + shippingCost + calculateTax(price, quantity)
  }

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

  const handleAddressSelect = (addressDetails: AddressDetails) => {
    setAddress(addressDetails.fullAddress)
    setStreetAddress(addressDetails.streetAddress)
    setCity(addressDetails.city)
    setState(addressDetails.state)
    setPostalCode(addressDetails.postalCode)
  }

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentStep("payment")
    window.scrollTo(0, 0)
  }

  const validatePaymentForm = (): boolean => {
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

    return isValid
  }

  const incrementQuantity = () => {
    if (product && purchaseQuantity < product.quantity) {
      setPurchaseQuantity(purchaseQuantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (purchaseQuantity > 1) {
      setPurchaseQuantity(purchaseQuantity - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !product) {
      setError("You must be logged in to complete this purchase")
      return
    }

    // Validate form before submission
    if (!validatePaymentForm()) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Process payment
      const paymentResult = await processPayment({
        cardNumber,
        expiryDate: cardExpiry,
        cvv: cardCvc,
        amount: calculateTotal(product.price, purchaseQuantity),
        currency: "USD",
      })

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed")
      }

      // Store transaction ID
      setTransactionId(paymentResult.transactionId || null)

      // Create an order in the database
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: product.seller_id,
          product_id: product.id,
          total_amount: calculateTotal(product.price, purchaseQuantity),
          commission_amount: calculateCommission(calculateSubtotal(product.price, purchaseQuantity)),
          seller_payout:
            calculateSubtotal(product.price, purchaseQuantity) -
            calculateCommission(calculateSubtotal(product.price, purchaseQuantity)),
          status: "paid",
          quantity: purchaseQuantity,
          shipping_address: {
            name,
            email,
            address,
            street_address: streetAddress,
            city,
            state,
            postal_code: postalCode,
            country,
          },
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Update product quantity
      const newQuantity = product.quantity - purchaseQuantity
      const newStatus = newQuantity > 0 ? "active" : "sold"

      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: newQuantity,
          status: newStatus,
        })
        .eq("id", product.id)

      if (productError) throw productError

      setPaymentSuccess(true)

      // Redirect to success page after a delay
      setTimeout(() => {
        router.push(`/checkout/success?orderId=${order.id}${transactionId ? `&transactionId=${transactionId}` : ""}`)
      }, 2000)
    } catch (error: any) {
      console.error("Payment error:", error)
      setError(error.message || "There was an error processing your payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p>Product not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto p-6 w-full">
        <div className="mb-6">
          <Link href={`/product/${productId}`} className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to product
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <div className="flex items-center text-sm text-gray-500">
            <Lock className="h-4 w-4 mr-1" /> Secure Checkout
          </div>
        </div>

        {paymentSuccess ? (
          <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
            <AlertTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" /> Payment Successful!
            </AlertTitle>
            <AlertDescription>
              Your payment has been processed. Transaction ID: {transactionId}. Redirecting to order confirmation...
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" /> Payment Failed
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden relative flex-shrink-0">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0].image_url || "/placeholder.svg"}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{product.title}</h3>
                  <p className="text-gray-500 text-sm">Seller: @{product.seller.username}</p>
                  <div className="flex items-center mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={decrementQuantity}
                      disabled={purchaseQuantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="mx-2 text-sm font-medium">{purchaseQuantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={incrementQuantity}
                      disabled={product.quantity <= purchaseQuantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="ml-2 text-xs text-gray-500">{product.quantity} available</span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Item price</span>
                  <span>${product.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity</span>
                  <span>× {purchaseQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${calculateSubtotal(product.price, purchaseQuantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${calculateTax(product.price, purchaseQuantity).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${calculateTotal(product.price, purchaseQuantity).toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 p-3 rounded-md text-sm text-gray-600 flex items-start gap-2">
                <ShieldCheck className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p>
                  Your payment is secure and encrypted. Once the purchase is complete, the seller will be notified to
                  ship your item.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {paymentStep === "shipping" ? (
                <form onSubmit={handleContinueToPayment} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <AddressAutocomplete
                          value={address}
                          onChange={setAddress}
                          onAddressSelect={handleAddressSelect}
                          required
                          placeholder="Start typing your address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry} disabled>
                          <SelectTrigger id="country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full" size="lg">
                      Continue to Payment
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
                    <Alert className="mb-4 bg-blue-50 border-blue-200">
                      <AlertDescription className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
                        You will be charged ${calculateTotal(product.price, purchaseQuantity).toFixed(2)} for this
                        purchase
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          {cardType !== "Unknown" && (
                            <span className="text-sm font-medium text-gray-500">{cardType}</span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                            required
                            className={cardNumberError ? "border-red-500" : ""}
                          />
                          <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        </div>
                        {cardNumberError && <p className="text-sm text-red-500">{cardNumberError}</p>}
                        <p className="text-xs text-gray-500">
                          For testing: Use any valid card number. Cards ending in "0000" will be declined.
                        </p>
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
                      <div className="flex items-center space-x-2 mt-4">
                        <Checkbox
                          id="savePayment"
                          checked={savePaymentInfo}
                          onCheckedChange={(checked) => setSavePaymentInfo(checked as boolean)}
                        />
                        <Label htmlFor="savePayment" className="text-sm">
                          Save payment information for future purchases
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                      {isProcessing ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing Payment...
                        </span>
                      ) : (
                        `Pay $${calculateTotal(product.price, purchaseQuantity).toFixed(2)}`
                      )}
                    </Button>
                    <p className="text-center text-sm text-gray-500 mt-4">
                      By completing this purchase, you agree to Looped's Terms of Service and Privacy Policy.
                    </p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
