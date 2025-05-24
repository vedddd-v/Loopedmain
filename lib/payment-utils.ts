/**
 * Validates a credit card number using the Luhn algorithm
 * @param cardNumber The credit card number to validate (can include spaces)
 * @returns boolean indicating if the card number is valid
 */
export function validateCardNumber(cardNumber: string): boolean {
  // Remove all non-digit characters
  const digits = cardNumber.replace(/\D/g, "")

  if (digits.length < 13 || digits.length > 19) {
    return false
  }

  // Luhn algorithm
  let sum = 0
  let shouldDouble = false

  // Loop through digits in reverse
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(digits.charAt(i))

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

/**
 * Validates if an expiry date is in the future
 * @param expiryDate The expiry date in MM/YY format
 * @returns boolean indicating if the expiry date is valid and in the future
 */
export function validateExpiryDate(expiryDate: string): boolean {
  // Check format
  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
    return false
  }

  const [month, year] = expiryDate.split("/").map((part) => Number.parseInt(part, 10))

  // Check month is between 1 and 12
  if (month < 1 || month > 12) {
    return false
  }

  // Get current date
  const now = new Date()
  const currentYear = now.getFullYear() % 100 // Get last two digits of year
  const currentMonth = now.getMonth() + 1 // getMonth() is 0-indexed

  // Check if the card is expired
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false
  }

  return true
}

/**
 * Validates a CVV/CVC code
 * @param cvv The CVV/CVC code
 * @returns boolean indicating if the CVV/CVC is valid
 */
export function validateCVV(cvv: string): boolean {
  // CVV should be 3 or 4 digits
  return /^\d{3,4}$/.test(cvv)
}

/**
 * Identifies the credit card type based on the card number
 * @param cardNumber The credit card number
 * @returns The card type (Visa, Mastercard, Amex, etc.) or "Unknown"
 */
export function getCardType(cardNumber: string): string {
  // Remove all non-digit characters
  const digits = cardNumber.replace(/\D/g, "")

  // Visa
  if (/^4/.test(digits)) {
    return "Visa"
  }

  // Mastercard
  if (/^5[1-5]/.test(digits)) {
    return "Mastercard"
  }

  // American Express
  if (/^3[47]/.test(digits)) {
    return "American Express"
  }

  // Discover
  if (/^6(?:011|5)/.test(digits)) {
    return "Discover"
  }

  return "Unknown"
}

/**
 * Simulates a payment processing request to a payment gateway
 * @param cardDetails The card details to process
 * @returns A promise that resolves with the payment result
 */
export async function processPayment(cardDetails: {
  cardNumber: string
  expiryDate: string
  cvv: string
  amount: number
  currency?: string
}): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Validate card details
  if (!validateCardNumber(cardDetails.cardNumber)) {
    return { success: false, error: "Invalid card number" }
  }

  if (!validateExpiryDate(cardDetails.expiryDate)) {
    return { success: false, error: "Card expired or invalid expiry date" }
  }

  if (!validateCVV(cardDetails.cvv)) {
    return { success: false, error: "Invalid CVV/CVC code" }
  }

  // Simulate network request to payment processor
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Simulate some declined cards for testing
  // Decline cards ending in '0000' or with amount > 10000
  if (cardDetails.cardNumber.endsWith("0000") || cardDetails.amount > 10000) {
    return {
      success: false,
      error: "Your card was declined. Please try a different payment method.",
    }
  }

  // Generate a fake transaction ID
  const transactionId = "txn_" + Math.random().toString(36).substring(2, 15)

  return {
    success: true,
    transactionId,
  }
}
