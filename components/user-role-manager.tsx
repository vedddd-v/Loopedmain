"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, ShieldAlert, ShieldCheck, UserCog } from "lucide-react"

type User = {
  id: string
  email: string
  created_at: string
  username: string
  roles: string[]
}

export default function UserRoleManager() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!currentUser) return

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .eq("role", "owner")
          .single()

        if (error) {
          console.error("Error checking owner status:", error)
          return
        }

        setIsOwner(!!data)
      } catch (error) {
        console.error("Error checking owner status:", error)
      }
    }

    checkOwnerStatus()
  }, [currentUser])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser || !isOwner) return

      try {
        setIsLoading(true)
        setError(null)

        // Use our custom RPC function to get users (only works for owner)
        const { data: authUsers, error: authError } = await supabase.rpc("get_all_users")

        if (authError) {
          throw authError
        }

        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, created_at")

        if (profilesError) {
          throw profilesError
        }

        // Get all user roles
        const { data: roleData, error: roleError } = await supabase.from("user_roles").select("user_id, role")

        if (roleError) {
          throw roleError
        }

        // Map roles to users
        const roleMap = roleData.reduce((acc, role) => {
          if (!acc[role.user_id]) {
            acc[role.user_id] = []
          }
          acc[role.user_id].push(role.role)
          return acc
        }, {})

        // Create a map of profiles for quick lookup
        const profileMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile
          return acc
        }, {})

        // Combine data from auth users and profiles
        const combinedUsers = authUsers.map((authUser) => {
          const profile = profileMap[authUser.id] || { username: "Unknown", created_at: authUser.created_at }

          return {
            id: authUser.id,
            email: authUser.email,
            username: profile.username,
            created_at: profile.created_at || authUser.created_at,
            roles: roleMap[authUser.id] || [],
          }
        })

        setUsers(combinedUsers)
      } catch (error: any) {
        console.error("Error fetching users:", error)
        setError(`Error fetching users: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [currentUser, isOwner])

  const handleRoleChange = async (userId: string, role: string, action: "add" | "remove") => {
    if (!currentUser || actionInProgress) return

    // Don't allow removing owner role from yourself
    if (userId === currentUser.id && role === "owner" && action === "remove") {
      setError("You cannot remove your own owner role")
      return
    }

    try {
      setActionInProgress(userId)

      if (action === "add") {
        // Add role
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role })

        if (error) throw error
      } else {
        // Remove role
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)

        if (error) throw error
      }

      // Update the local state
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user.id === userId) {
            const roles = action === "add" ? [...user.roles, role] : user.roles.filter((r) => r !== role)
            return { ...user, roles }
          }
          return user
        }),
      )
    } catch (error: any) {
      console.error(`Error ${action === "add" ? "adding" : "removing"} role:`, error)
      setError(`Error ${action === "add" ? "adding" : "removing"} role: ${error.message}`)
    } finally {
      setActionInProgress(null)
    }
  }

  if (!isOwner) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Only the owner can manage user roles.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          User Role Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-8">Loading users...</div>
        ) : (
          <div className="space-y-6">
            {users.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No users found</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-gray-500">Username: @{user.username}</p>
                      <p className="text-sm text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {user.roles.includes("owner") && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Owner
                          </span>
                        )}
                        {user.roles.includes("admin") && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </span>
                        )}
                        {user.roles.length === 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            User
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!user.roles.includes("admin") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleRoleChange(user.id, "admin", "add")}
                          disabled={actionInProgress === user.id}
                        >
                          <Shield className="w-4 h-4" />
                          Make Admin
                        </Button>
                      )}
                      {user.roles.includes("admin") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleRoleChange(user.id, "admin", "remove")}
                          disabled={actionInProgress === user.id}
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Remove Admin
                        </Button>
                      )}
                      {!user.roles.includes("owner") && isOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleRoleChange(user.id, "owner", "add")}
                          disabled={actionInProgress === user.id}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Make Owner
                        </Button>
                      )}
                      {user.roles.includes("owner") && user.id !== currentUser?.id && isOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleRoleChange(user.id, "owner", "remove")}
                          disabled={actionInProgress === user.id}
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Remove Owner
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
