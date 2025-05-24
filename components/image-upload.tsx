"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { v4 as uuidv4 } from "uuid"

interface ImageUploadProps {
  onImageUploaded: (url: string) => void
  className?: string
}

export default function ImageUpload({ onImageUploaded, className = "" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file")
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size should be less than 5MB")
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      // Create a preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Generate a unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from("product-images").upload(filePath, file)

      if (error) {
        throw error
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(filePath)

      // Call the callback with the URL
      onImageUploaded(publicUrlData.publicUrl)
    } catch (error: any) {
      console.error("Error uploading image:", error)
      setUploadError(error.message || "Failed to upload image")
      setPreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={`${className}`}>
      {preview ? (
        <div className="relative">
          <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-40 object-cover rounded-md" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={isUploading}
          />
          <div
            className="flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="animate-pulse">Uploading...</div>
            ) : (
              <>
                <div className="bg-gray-100 p-4 rounded-full mb-2">
                  <ImageIcon className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 mb-2">Click to upload product image</p>
                <Button type="button" variant="outline" size="sm" className="flex items-center gap-1">
                  <Upload className="h-4 w-4" />
                  Select Image
                </Button>
              </>
            )}
          </div>
          {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
        </div>
      )}
    </div>
  )
}
