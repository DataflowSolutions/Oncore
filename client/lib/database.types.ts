
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          category: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          org_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log_archive: {
        Row: {
          action: string
          archived_at: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          org_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          archived_at?: string
          created_at: string
          details?: Json | null
          id: string
          ip_address?: unknown
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          archived_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      activity_log_retention_config: {
        Row: {
          archive_batch_size: number
          auto_archive_enabled: boolean
          days_to_keep: number
          id: number
          last_archive_run: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_batch_size?: number
          auto_archive_enabled?: boolean
          days_to_keep?: number
          id?: number
          last_archive_run?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_batch_size?: number
          auto_archive_enabled?: boolean
          days_to_keep?: number
          id?: number
          last_archive_run?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      advancing_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          field_id: string
          id: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          field_id: string
          id?: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          field_id?: string
          id?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advancing_comments_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "advancing_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "advancing_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      advancing_documents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          org_id: string
          party_type: Database["public"]["Enums"]["party"]
          session_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          org_id: string
          party_type: Database["public"]["Enums"]["party"]
          session_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          org_id?: string
          party_type?: Database["public"]["Enums"]["party"]
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advancing_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "advancing_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advancing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      advancing_fields: {
        Row: {
          created_at: string
          created_by: string
          field_name: string
          field_type: string
          id: string
          org_id: string
          party_type: Database["public"]["Enums"]["party"]
          section: string
          session_id: string
          sort_order: number
          status: Database["public"]["Enums"]["field_status"]
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          field_name: string
          field_type?: string
          id?: string
          org_id: string
          party_type: Database["public"]["Enums"]["party"]
          section: string
          session_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["field_status"]
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          field_name?: string
          field_type?: string
          id?: string
          org_id?: string
          party_type?: Database["public"]["Enums"]["party"]
          section?: string
          session_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["field_status"]
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "advancing_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "advancing_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_fields_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advancing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      advancing_sessions: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          org_id: string
          show_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          org_id: string
          show_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          show_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advancing_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "advancing_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_sessions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_sessions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "artists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          max_artists: number | null
          max_collaborators: number | null
          max_members: number | null
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id: string
          max_artists?: number | null
          max_collaborators?: number | null
          max_members?: number | null
          name: string
          price_cents: number
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          max_artists?: number | null
          max_collaborators?: number | null
          max_members?: number | null
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      contact_commissions: {
        Row: {
          amount: number
          contact_id: string
          created_at: string
          description: string | null
          id: string
          paid_at: string | null
          show_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          show_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          show_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_commissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          commission_rate: number | null
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          role: string | null
          status: string
          tsv: unknown
          type: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          commission_rate?: number | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          role?: string | null
          status?: string
          tsv?: unknown
          type: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          commission_rate?: number | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          role?: string | null
          status?: string
          tsv?: unknown
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      database_maintenance_log: {
        Row: {
          completed_at: string | null
          details: Json | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          operation: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          operation: string
          started_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          operation?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          content_type: string | null
          created_at: string
          document_id: string | null
          field_id: string | null
          id: string
          org_id: string
          original_name: string | null
          session_id: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          document_id?: string | null
          field_id?: string | null
          id?: string
          org_id: string
          original_name?: string | null
          session_id?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          document_id?: string | null
          field_id?: string | null
          id?: string
          org_id?: string
          original_name?: string | null
          session_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "advancing_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "advancing_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advancing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          org_id: string
          person_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          org_id: string
          person_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          person_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      org_feature_overrides: {
        Row: {
          created_at: string
          key: string
          org_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          org_id: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          org_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_feature_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          org_id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          org_id: string
          plan_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          org_id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "org_entitlements_cache"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      parsed_contracts: {
        Row: {
          confidence: number | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          org_id: string
          parsed_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          org_id: string
          parsed_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          org_id?: string
          parsed_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "parsed_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_emails: {
        Row: {
          created_at: string
          from_email: string | null
          id: string
          org_id: string
          parsed_data: Json | null
          raw_content: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_email?: string | null
          id?: string
          org_id: string
          parsed_data?: Json | null
          raw_content: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_email?: string | null
          id?: string
          org_id?: string
          parsed_data?: Json | null
          raw_content?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "parsed_emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          email: string | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"] | null
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          role_title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          member_type?: Database["public"]["Enums"]["member_type"] | null
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          role_title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          member_type?: Database["public"]["Enums"]["member_type"] | null
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          role_title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      query_performance_log: {
        Row: {
          created_at: string
          execution_time_ms: number
          id: string
          org_id: string | null
          query_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          execution_time_ms: number
          id?: string
          org_id?: string | null
          query_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          execution_time_ms?: number
          id?: string
          org_id?: string | null
          query_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rls_expected_access: {
        Row: {
          can_delete: boolean
          can_insert: boolean
          can_select: boolean
          can_update: boolean
          created_at: string
          id: string
          notes: string | null
          role: string
          table_name: string
        }
        Insert: {
          can_delete?: boolean
          can_insert?: boolean
          can_select?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          role: string
          table_name: string
        }
        Update: {
          can_delete?: boolean
          can_insert?: boolean
          can_select?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          role?: string
          table_name?: string
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          auto_generated: boolean | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          ends_at: string | null
          external_calendar_id: string | null
          id: string
          item_type: string | null
          location: string | null
          notes: string | null
          org_id: string
          person_id: string | null
          priority: number | null
          session_id: string | null
          show_id: string | null
          source_field_id: string | null
          starts_at: string
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          external_calendar_id?: string | null
          id?: string
          item_type?: string | null
          location?: string | null
          notes?: string | null
          org_id: string
          person_id?: string | null
          priority?: number | null
          session_id?: string | null
          show_id?: string | null
          source_field_id?: string | null
          starts_at: string
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          external_calendar_id?: string | null
          id?: string
          item_type?: string | null
          location?: string | null
          notes?: string | null
          org_id?: string
          person_id?: string | null
          priority?: number | null
          session_id?: string | null
          show_id?: string | null
          source_field_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "schedule_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advancing_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_source_field_id_fkey"
            columns: ["source_field_id"]
            isOneToOne: false
            referencedRelation: "advancing_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      show_assignments: {
        Row: {
          duty: string | null
          person_id: string
          show_id: string
        }
        Insert: {
          duty?: string | null
          person_id: string
          show_id: string
        }
        Update: {
          duty?: string | null
          person_id?: string
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_assignments_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_assignments_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["id"]
          },
        ]
      }
      show_collaborators: {
        Row: {
          created_at: string
          email: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["show_collab_role"]
          show_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["show_collab_role"]
          show_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["show_collab_role"]
          show_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "show_collaborators_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "show_collaborators_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_collaborators_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_collaborators_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist_id: string | null
          created_at: string
          date: string
          doors_at: string | null
          fee: number | null
          fee_currency: string | null
          id: string
          notes: string | null
          org_id: string
          set_time: string | null
          status: Database["public"]["Enums"]["show_status"]
          title: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          date: string
          doors_at?: string | null
          fee?: number | null
          fee_currency?: string | null
          id?: string
          notes?: string | null
          org_id: string
          set_time?: string | null
          status?: Database["public"]["Enums"]["show_status"]
          title?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          date?: string
          doors_at?: string | null
          fee?: number | null
          fee_currency?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          set_time?: string | null
          status?: Database["public"]["Enums"]["show_status"]
          title?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["artist_id"]
          },
          {
            foreignKeyName: "shows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "shows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "shows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          venue_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          venue_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_promoters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_promoters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          contacts: Json | null
          country: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          tsv: unknown
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          tsv?: unknown
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          tsv?: unknown
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      billing_actions_log: {
        Row: {
          action: string | null
          created_at: string | null
          id: string | null
          new_state: string | null
          org_id: string | null
          previous_state: string | null
          triggered_by: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string | null
          new_state?: never
          org_id?: string | null
          previous_state?: never
          triggered_by?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string | null
          new_state?: never
          org_id?: string | null
          previous_state?: never
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_entitlements_cache: {
        Row: {
          base_entitlements: Json | null
          current_period_end: string | null
          org_id: string | null
          overrides: Json | null
          plan_id: string | null
          subscription_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_seat_usage: {
        Row: {
          artists_used: number | null
          collaborators_used: number | null
          members_used: number | null
          org_id: string | null
          org_name: string | null
        }
        Insert: {
          artists_used?: never
          collaborators_used?: never
          members_used?: never
          org_id?: string | null
          org_name?: string | null
        }
        Update: {
          artists_used?: never
          collaborators_used?: never
          members_used?: never
          org_id?: string | null
          org_name?: string | null
        }
        Relationships: []
      }
      shows_list_view: {
        Row: {
          artist_id: string | null
          artist_name: string | null
          date: string | null
          doors_at: string | null
          id: string | null
          org_id: string | null
          set_time: string | null
          status: Database["public"]["Enums"]["show_status"] | null
          title: string | null
          venue_city: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "shows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      admin_set_feature_override: {
        Args: { p_key: string; p_org_id: string; p_value: Json }
        Returns: undefined
      }
      admin_update_subscription: {
        Args: {
          p_extend_days?: number
          p_org_id: string
          p_plan_id?: string
          p_status?: string
        }
        Returns: undefined
      }
      app_add_show_collaborator: {
        Args: {
          p_role?: Database["public"]["Enums"]["show_collab_role"]
          p_show_id: string
          p_user_id: string
        }
        Returns: string
      }
      app_assign_plan_debug: {
        Args: { p_org_id: string; p_plan_id: string; p_trial_days?: number }
        Returns: undefined
      }
      app_can_access_show: { Args: { p_show_id: string }; Returns: boolean }
      app_create_advancing_session: {
        Args: {
          p_expires_at?: string
          p_session_title: string
          p_show_id: string
        }
        Returns: string
      }
      app_create_organization_with_owner: {
        Args: { org_name: string; org_slug: string }
        Returns: string
      }
      app_get_show_role: { Args: { p_show_id: string }; Returns: string }
      app_log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_org_id: string
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      app_upload_file: {
        Args: {
          bucket_name: string
          file_path: string
          p_content_type?: string
          p_document_id?: string
          p_field_id?: string
          p_org_id: string
          p_original_name?: string
          p_party_type?: string
          p_session_id?: string
          p_show_id?: string
          p_size_bytes?: number
        }
        Returns: Json
      }
      archive_old_activity_logs: {
        Args: { batch_size?: number; days_to_keep?: number }
        Returns: Json
      }
      auto_downgrade_expired_orgs: {
        Args: never
        Returns: {
          action: string
          org_id: string
          previous_plan: string
        }[]
      }
      bulk_update_show_dates: { Args: { p_updates: Json }; Returns: Json }
      can_person_get_user_access: {
        Args: { p_person_id: string }
        Returns: Json
      }
      check_available_seats: { Args: { p_org_id: string }; Returns: Json }
      check_maintenance_needed: { Args: never; Returns: Json }
      check_org_limits: {
        Args: {
          p_additional_count?: number
          p_check_type: string
          p_org_id: string
        }
        Returns: boolean
      }
      check_org_limits_detailed: {
        Args: {
          p_additional_count?: number
          p_check_type: string
          p_org_id: string
        }
        Returns: Json
      }
      check_rls_enabled: { Args: { table_name: string }; Returns: boolean }
      cleanup_orphaned_user_references: { Args: never; Returns: Json }
      cleanup_unverified_files: {
        Args: { hours_old?: number }
        Returns: {
          cleaned_file_id: string
          cleaned_storage_path: string
          reason: string
        }[]
      }
      create_advancing_session: {
        Args: { p_org_id: string; p_show_id: string; p_title?: string }
        Returns: Json
      }
      generate_rls_coverage_report: { Args: never; Returns: Json }
      generate_secure_token: { Args: never; Returns: string }
      get_activity_log_stats: { Args: never; Returns: Json }
      get_activity_logs: {
        Args: {
          p_include_archived?: boolean
          p_limit?: number
          p_offset?: number
          p_org_id: string
        }
        Returns: {
          action: string
          created_at: string
          details: Json
          id: string
          ip_address: unknown
          is_archived: boolean
          org_id: string
          resource_id: string
          resource_type: string
          user_agent: string
          user_id: string
        }[]
      }
      get_advancing_session_details: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_expected_access: {
        Args: { p_role: string; p_table_name?: string }
        Returns: {
          can_delete: boolean
          can_insert: boolean
          can_select: boolean
          can_update: boolean
          notes: string
          role: string
          table_name: string
        }[]
      }
      get_invitation_by_token: { Args: { p_token: string }; Returns: Json }
      get_maintenance_stats: { Args: { days_back?: number }; Returns: Json }
      get_show_stats: { Args: { p_org_id: string }; Returns: Json }
      get_table_policies: {
        Args: { table_name: string }
        Returns: {
          command: string
          is_permissive: string
          policy_name: string
          using_expression: string
        }[]
      }
      has_show_access: {
        Args: { min_role: string; p_show: string }
        Returns: boolean
      }
      is_org_editor: { Args: { p_org: string }; Returns: boolean }
      is_org_editor_and_active: { Args: { p_org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      is_org_member_and_active: { Args: { p_org: string }; Returns: boolean }
      is_supabase_admin: { Args: never; Returns: boolean }
      log_billing_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_org_id: string
          p_user_id?: string
        }
        Returns: string
      }
      org_billing_dashboard: { Args: { p_org_id: string }; Returns: Json }
      org_entitlements: { Args: { p_org: string }; Returns: Json }
      org_is_active: { Args: { p_org: string }; Returns: boolean }
      org_is_active_with_grace: {
        Args: { p_grace_days?: number; p_org: string }
        Returns: boolean
      }
      org_subscription_status: { Args: { p_org: string }; Returns: Json }
      run_analyze_all_tables: { Args: never; Returns: Json }
      run_analyze_with_logging: {
        Args: { triggered_by?: string }
        Returns: Json
      }
      run_rls_tests: { Args: never; Returns: Json }
      run_scheduled_log_archival: { Args: never; Returns: Json }
      run_vacuum_all_tables: { Args: never; Returns: Json }
      run_vacuum_with_logging: {
        Args: { triggered_by?: string }
        Returns: Json
      }
      setup_rls_test_data: { Args: never; Returns: undefined }
      verify_access_code: { Args: { p_access_code: string }; Returns: Json }
      verify_rls_enabled_on_all_tables: { Args: never; Returns: Json }
      verify_storage_metadata: {
        Args: { hours_back?: number }
        Returns: {
          expected_metadata: Json
          file_id: string
          requires_edge_function: boolean
          storage_path: string
          verification_status: string
        }[]
      }
    }
    Enums: {
      field_status: "pending" | "confirmed"
      member_type: "Artist" | "Crew" | "Agent" | "Manager"
      org_role: "owner" | "admin" | "editor" | "viewer"
      party: "from_us" | "from_you"
      show_collab_role: "promoter_editor" | "promoter_viewer"
      show_invite_status: "invited" | "accepted" | "revoked"
      show_status: "draft" | "confirmed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      field_status: ["pending", "confirmed"],
      member_type: ["Artist", "Crew", "Agent", "Manager"],
      org_role: ["owner", "admin", "editor", "viewer"],
      party: ["from_us", "from_you"],
      show_collab_role: ["promoter_editor", "promoter_viewer"],
      show_invite_status: ["invited", "accepted", "revoked"],
      show_status: ["draft", "confirmed", "cancelled"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
} as const
