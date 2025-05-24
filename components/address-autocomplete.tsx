"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Define the props for our component
interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (address: AddressDetails) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
}

// Define the structure for address details
export interface AddressDetails {
  fullAddress: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  country: string
}

// Define the structure for Mapbox feature
interface MapboxFeature {
  id: string
  place_name: string
  text: string
  place_type: string[]
  properties: {
    accuracy?: string
  }
  context: Array<{
    id: string
    text: string
    short_code?: string
  }>
  address?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  label = "Address",
  placeholder = "Enter your address",
  required = false,
  className = "",
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState("")
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize with the provided value
  useEffect(() => {
    if (value && !inputValue) {
      setInputValue(value)
    }
  }, [value])

  // Fetch address suggestions from Mapbox API
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      // Using Mapbox API for address autocomplete
      // Note: In a production app, you would want to proxy this request through your backend
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA&country=us&types=address&autocomplete=true&limit=5`,
      )

      const data = await response.json()
      setSuggestions(data.features || [])
    } catch (error) {
      console.error("Error fetching address suggestions:", error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change with debounce
  const handleInputChange = (value: string) => {
    setInputValue(value)

    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    // Set new timeout
    debounceTimeout.current = setTimeout(() => {
      fetchAddressSuggestions(value)
    }, 300)
  }

  // Parse address components from Mapbox feature
  const parseAddressComponents = (feature: MapboxFeature): AddressDetails => {
    let streetAddress = ""
    let city = ""
    let state = ""
    let postalCode = ""

    // Extract street number and name
    if (feature.address) {
      streetAddress = `${feature.address} ${feature.text}`
    } else {
      streetAddress = feature.text
    }

    // Extract city, state, and postal code from context
    feature.context?.forEach((ctx) => {
      const id = ctx.id.split(".")[0]
      if (id === "place") {
        city = ctx.text
      } else if (id === "region" && ctx.short_code) {
        state = ctx.short_code.toUpperCase().replace("US-", "")
      } else if (id === "postcode") {
        postalCode = ctx.text
      }
    })

    return {
      fullAddress: feature.place_name,
      streetAddress,
      city,
      state,
      postalCode,
      country: "United States",
    }
  }

  // Handle address selection
  const handleAddressSelect = (feature: MapboxFeature) => {
    const addressDetails = parseAddressComponents(feature)
    setInputValue(addressDetails.fullAddress)
    onChange(addressDetails.fullAddress)

    if (onAddressSelect) {
      onAddressSelect(addressDetails)
    }

    setOpen(false)
  }

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="address-autocomplete">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              id="address-autocomplete"
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              required={required}
              className={`pr-10 ${className}`}
              onFocus={() => inputValue.length >= 3 && setOpen(true)}
            />
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" sideOffset={5}>
          <Command>
            <CommandList>
              <CommandInput placeholder="Search address..." value={inputValue} onValueChange={handleInputChange} />
              {isLoading && <CommandEmpty>Loading suggestions...</CommandEmpty>}
              {!isLoading && suggestions.length === 0 && <CommandEmpty>No addresses found</CommandEmpty>}
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.id}
                    value={suggestion.place_name}
                    onSelect={() => handleAddressSelect(suggestion)}
                  >
                    <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                    <span>{suggestion.place_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
