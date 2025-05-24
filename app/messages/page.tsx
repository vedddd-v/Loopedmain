"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"
import Header from "@/components/header"
import CategoryNav from "@/components/category-nav"
import AuthGuard from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Conversation = {
  user_id: string
  username: string
  avatar_url: string | null
  last_message_at: string
  unread_count: number
}

type Message = {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  read: boolean
}

export default function MessagesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const sellerId = searchParams.get("seller")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(sellerId)
  const [activeUsername, setActiveUsername] = useState<string>("")
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return

      try {
        // Get all conversations
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("sender_id, recipient_id, created_at, read")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (messagesError) throw messagesError

        // Extract unique conversation partners
        const conversationPartners = new Map<
          string,
          {
            last_message_at: string
            unread_count: number
          }
        >()

        messagesData.forEach((msg) => {
          const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id

          if (!conversationPartners.has(partnerId)) {
            conversationPartners.set(partnerId, {
              last_message_at: msg.created_at,
              unread_count: msg.recipient_id === user.id && !msg.read ? 1 : 0,
            })
          } else {
            const current = conversationPartners.get(partnerId)!
            if (msg.recipient_id === user.id && !msg.read) {
              current.unread_count += 1
            }
          }
        })

        // Get user details for each conversation partner
        const partnerIds = Array.from(conversationPartners.keys())

        if (partnerIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", partnerIds)

          if (profilesError) throw profilesError

          const formattedConversations = profilesData
            .map((profile) => {
              const conversationInfo = conversationPartners.get(profile.id)!
              return {
                user_id: profile.id,
                username: profile.username,
                avatar_url: profile.avatar_url,
                last_message_at: conversationInfo.last_message_at,
                unread_count: conversationInfo.unread_count,
              }
            })
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

          setConversations(formattedConversations)
        }

        // If seller ID is provided, check if we need to add them to conversations
        if (sellerId && !partnerIds.includes(sellerId)) {
          const { data: sellerData, error: sellerError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", sellerId)
            .single()

          if (!sellerError && sellerData) {
            setConversations([
              {
                user_id: sellerData.id,
                username: sellerData.username,
                avatar_url: sellerData.avatar_url,
                last_message_at: new Date().toISOString(),
                unread_count: 0,
              },
              ...conversations,
            ])
            setActiveConversation(sellerId)
            setActiveUsername(sellerData.username)
          }
        }

        // If we have an active conversation, load its messages
        if (activeConversation) {
          loadMessages(activeConversation)
        } else if (conversations.length > 0) {
          // Set first conversation as active if none is selected
          setActiveConversation(conversations[0].user_id)
          setActiveUsername(conversations[0].username)
          loadMessages(conversations[0].user_id)
        }
      } catch (error) {
        console.error("Error fetching conversations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [user, sellerId])

  const loadMessages = async (partnerId: string) => {
    if (!user) return

    try {
      // Get messages between current user and partner
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })

      if (error) throw error

      setMessages(data || [])

      // Mark unread messages as read
      const unreadMessageIds = data?.filter((msg) => msg.recipient_id === user.id && !msg.read).map((msg) => msg.id)

      if (unreadMessageIds && unreadMessageIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadMessageIds)

        // Update unread count in conversations
        setConversations(
          conversations.map((conv) => {
            if (conv.user_id === partnerId) {
              return { ...conv, unread_count: 0 }
            }
            return conv
          }),
        )
      }

      // Get partner username if not already set
      if (!activeUsername) {
        const { data: profileData } = await supabase.from("profiles").select("username").eq("id", partnerId).single()

        if (profileData) {
          setActiveUsername(profileData.username)
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !activeConversation || !newMessage.trim()) return

    try {
      // Add message to database
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: activeConversation,
          content: newMessage.trim(),
          read: false,
        })
        .select()
        .single()

      if (error) throw error

      // Update local messages
      setMessages([...messages, data])

      // Clear input
      setNewMessage("")

      // Update conversation last message time
      setConversations(
        conversations.map((conv) => {
          if (conv.user_id === activeConversation) {
            return { ...conv, last_message_at: new Date().toISOString() }
          }
          return conv
        }),
      )
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <CategoryNav />

        <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col">
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-8">Messages</h1>

          <div className="flex flex-1 border rounded-lg overflow-hidden">
            {/* Conversations sidebar */}
            <div className="w-1/3 border-r">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Conversations</h2>
              </div>

              {isLoading ? (
                <div className="p-4 text-center">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations yet</div>
              ) : (
                <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.user_id}
                      className={`w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 ${
                        activeConversation === conversation.user_id ? "bg-gray-100" : ""
                      }`}
                      onClick={() => {
                        setActiveConversation(conversation.user_id)
                        setActiveUsername(conversation.username)
                        loadMessages(conversation.user_id)
                      }}
                    >
                      <Avatar>
                        <AvatarImage src={conversation.avatar_url || "/placeholder.svg?text=U"} />
                        <AvatarFallback>{conversation.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium truncate">@{conversation.username}</p>
                          {conversation.unread_count > 0 && (
                            <span className="bg-black text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {new Date(conversation.last_message_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Messages area */}
            <div className="w-2/3 flex flex-col">
              {activeConversation ? (
                <>
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">@{activeUsername}</h2>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-400px)]">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                message.sender_id === user?.id
                                  ? "bg-black text-white rounded-tr-none"
                                  : "bg-gray-100 rounded-tl-none"
                              }`}
                            >
                              <p>{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${message.sender_id === user?.id ? "text-gray-300" : "text-gray-500"}`}
                              >
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!newMessage.trim()}>
                        Send
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
