"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function ConnectionTest() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setResult(null)

    try {
      // Test basic connection
      const { data, error } = await supabase.from("categories").select("count").limit(1)

      if (error) {
        setResult(`❌ Connection failed: ${error.message}`)
      } else {
        setResult("✅ Connection successful!")
      }
    } catch (error) {
      setResult(`❌ Network error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">Supabase Connection Test</h3>
      <Button onClick={testConnection} disabled={testing} className="mb-2">
        {testing ? "Testing..." : "Test Connection"}
      </Button>
      {result && <div className="text-sm mt-2 p-2 rounded bg-white border">{result}</div>}
    </div>
  )
}
