"use client"

import { useState } from "react"

export default function DebugInfo() {
  const [showDebug, setShowDebug] = useState(false)

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4">
        <button onClick={() => setShowDebug(true)} className="bg-red-500 text-white px-3 py-1 rounded text-xs">
          Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-lg rounded-lg p-4 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Debug Info</h3>
        <button onClick={() => setShowDebug(false)} className="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>
      <div className="text-xs space-y-1">
        <div>
          <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
        </div>
        <div>
          <strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}
        </div>
        <div>
          <strong>Environment:</strong> {process.env.NODE_ENV || "unknown"}
        </div>
      </div>
    </div>
  )
}
