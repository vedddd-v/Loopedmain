"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const setData = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Session error:", error)
          setIsLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      } catch (error) {
        console.error("Auth initialization error:", error)
        setIsLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    setData()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, username: string) => {
    setIsLoading(true)

    try {
      // First sign up the user
      const {
        data: { user, session },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      })

      if (error) throw error

      if (!user) {
        throw new Error("User creation failed")
      }

      // Create a profile for the user
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        username,
        full_name: "",
        avatar_url: "",
        bio: "",
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // If profile creation fails, we should still continue since the user was created
        // But we'll log the error for debugging
      }

      if (session) {
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Error in signUp:", error)
      throw new Error(error?.message || "Sign up failed")
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)
        throw new Error(error.message)
      }

      if (data.user) {
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Error in signIn:", error)
      throw new Error(error?.message || "Sign in failed")
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      router.push("/")
    } catch (error: any) {
      console.error("Error in signOut:", error)
      throw new Error(error?.message || "Sign out failed")
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
