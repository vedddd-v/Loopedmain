export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          payment_details: Json | null
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          payment_details?: Json | null
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          payment_details?: Json | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          title: string
          description: string
          price: number
          size: string
          condition: string
          seller_id: string
          category_id: number
          status: string
          created_at: string
          updated_at: string
          quantity: number
        }
        Insert: {
          id?: string
          title: string
          description: string
          price: number
          size: string
          condition: string
          seller_id: string
          category_id: number
          status?: string
          created_at?: string
          updated_at?: string
          quantity?: number
        }
        Update: {
          id?: string
          title?: string
          description?: string
          price?: number
          size?: string
          condition?: string
          seller_id?: string
          category_id?: number
          status?: string
          created_at?: string
          updated_at?: string
          quantity?: number
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          is_primary?: boolean
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string
          product_id: string
          status: string
          total_amount: number
          shipping_address: Json | null
          created_at: string
          updated_at: string
          quantity: number
          commission_amount: number
          seller_payout: number
        }
        Insert: {
          id?: string
          buyer_id: string
          seller_id: string
          product_id: string
          status?: string
          total_amount: number
          shipping_address?: Json | null
          created_at?: string
          updated_at?: string
          quantity?: number
          commission_amount?: number
          seller_payout?: number
        }
        Update: {
          id?: string
          buyer_id?: string
          seller_id?: string
          product_id?: string
          status?: string
          total_amount?: number
          shipping_address?: Json | null
          created_at?: string
          updated_at?: string
          quantity?: number
          commission_amount?: number
          seller_payout?: number
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          product_id: string | null
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          product_id?: string | null
          content: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          product_id?: string | null
          content?: string
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      conversations: {
        Row: {
          user1_id: string | null
          user2_id: string | null
          last_message_at: string | null
          user1_username: string | null
          user2_username: string | null
        }
      }
    }
  }
}
