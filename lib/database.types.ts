export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          org_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
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
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "advancing_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
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
            foreignKeyName: "advancing_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
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
            foreignKeyName: "advancing_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
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
          access_code_hash: string | null
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
          access_code_hash?: string | null
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
          access_code_hash?: string | null
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
            foreignKeyName: "advancing_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_sessions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
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
          {
            foreignKeyName: "artists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_actions_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_state: Json | null
          org_id: string | null
          previous_state: Json | null
          triggered_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_state?: Json | null
          org_id?: string | null
          previous_state?: Json | null
          triggered_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_state?: Json | null
          org_id?: string | null
          previous_state?: Json | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_actions_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "billing_actions_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_actions_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
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
            foreignKeyName: "files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
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
          {
            foreignKeyName: "org_feature_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          invited_email: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_email?: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          invited_email?: string | null
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
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      org_seats: {
        Row: {
          org_id: string
          seat_type: string
          updated_at: string
          used: number
        }
        Insert: {
          org_id: string
          seat_type: string
          updated_at?: string
          used?: number
        }
        Update: {
          org_id?: string
          seat_type?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_seats_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_seats_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_seats_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
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
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          org_id: string
          show_id: string | null
          starts_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          org_id: string
          show_id?: string | null
          starts_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          org_id?: string
          show_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string | null
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
            foreignKeyName: "schedule_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
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
        ]
      }
      show_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invite_token: string | null
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["show_collab_role"]
          show_id: string
          status: Database["public"]["Enums"]["show_invite_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["show_collab_role"]
          show_id: string
          status?: Database["public"]["Enums"]["show_invite_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["show_collab_role"]
          show_id?: string
          status?: Database["public"]["Enums"]["show_invite_status"]
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
            foreignKeyName: "show_collaborators_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_collaborators_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
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
            foreignKeyName: "shows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "venues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_requiring_attention"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
      orgs_requiring_attention: {
        Row: {
          artists_used: number | null
          collaborators_used: number | null
          current_period_end: string | null
          days_until_expiry: number | null
          id: string | null
          members_used: number | null
          name: string | null
          plan_id: string | null
          requires_immediate_action: boolean | null
          slug: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_feature_override: {
        Args: {
          p_org_id: string
          p_key: string
          p_value: Json
        }
        Returns: undefined
      }
      admin_update_subscription: {
        Args: {
          p_org_id: string
          p_plan_id?: string
          p_status?: string
          p_extend_days?: number
        }
        Returns: undefined
      }
      app_accept_show_invite:
        | {
            Args: {
              invite_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_show_id: string
              p_email: string
            }
            Returns: boolean
          }
      app_assign_plan_debug: {
        Args: {
          p_org_id: string
          p_plan_id: string
          p_trial_days?: number
        }
        Returns: undefined
      }
      app_can_access_show: {
        Args: {
          p_show_id: string
        }
        Returns: boolean
      }
      app_create_advancing_session: {
        Args: {
          p_show_id: string
          p_session_title: string
          p_expires_at?: string
        }
        Returns: string
      }
      app_create_organization_with_owner: {
        Args: {
          org_name: string
          org_slug: string
        }
        Returns: string
      }
      app_get_show_role: {
        Args: {
          p_show_id: string
        }
        Returns: string
      }
      app_invite_collaborator: {
        Args: {
          p_show_id: string
          p_email: string
          p_role?: Database["public"]["Enums"]["show_collab_role"]
        }
        Returns: string
      }
      app_invite_collaborator_enhanced: {
        Args: {
          p_show_id: string
          p_email: string
          p_role?: Database["public"]["Enums"]["show_collab_role"]
        }
        Returns: Json
      }
      app_log_activity: {
        Args: {
          p_org_id: string
          p_action: string
          p_resource_type: string
          p_resource_id?: string
          p_details?: Json
        }
        Returns: undefined
      }
      app_send_show_invite: {
        Args: {
          p_show_id: string
          p_email: string
          p_role?: string
        }
        Returns: string
      }
      app_upload_file: {
        Args: {
          bucket_name: string
          file_path: string
          p_org_id: string
          p_show_id?: string
          p_session_id?: string
          p_document_id?: string
          p_field_id?: string
          p_party_type?: string
          p_original_name?: string
          p_content_type?: string
          p_size_bytes?: number
        }
        Returns: Json
      }
      archive_old_activity_logs: {
        Args: {
          days_to_keep?: number
        }
        Returns: number
      }
      auto_downgrade_expired_orgs: {
        Args: Record<PropertyKey, never>
        Returns: {
          org_id: string
          previous_plan: string
          action: string
        }[]
      }
      check_org_limits: {
        Args: {
          p_org_id: string
          p_check_type: string
          p_additional_count?: number
        }
        Returns: boolean
      }
      check_org_limits_detailed: {
        Args: {
          p_org_id: string
          p_check_type: string
          p_additional_count?: number
        }
        Returns: Json
      }
      citext:
        | {
            Args: {
              "": boolean
            }
            Returns: string
          }
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: string
          }
      citext_hash: {
        Args: {
          "": string
        }
        Returns: number
      }
      citextin: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      citextout: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      citextrecv: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      citextsend: {
        Args: {
          "": string
        }
        Returns: string
      }
      cleanup_unverified_files: {
        Args: {
          hours_old?: number
        }
        Returns: {
          cleaned_file_id: string
          storage_path: string
          reason: string
        }[]
      }
      has_show_access: {
        Args: {
          p_show: string
          min_role: string
        }
        Returns: boolean
      }
      is_org_editor: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      is_supabase_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      org_billing_dashboard: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      org_entitlements: {
        Args: {
          p_org: string
        }
        Returns: Json
      }
      org_is_active: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      org_is_active_with_grace: {
        Args: {
          p_org: string
          p_grace_days?: number
        }
        Returns: boolean
      }
      org_subscription_status: {
        Args: {
          p_org: string
        }
        Returns: Json
      }
      verify_storage_metadata: {
        Args: {
          hours_back?: number
        }
        Returns: {
          file_id: string
          storage_path: string
          expected_metadata: Json
          verification_status: string
          requires_edge_function: boolean
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
      iceberg_namespaces: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
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
        Args: {
          _bucket_id: string
          _name: string
        }
        Returns: undefined
      }
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      delete_prefix: {
        Args: {
          _bucket_id: string
          _name: string
        }
        Returns: boolean
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_level: {
        Args: {
          name: string
        }
        Returns: number
      }
      get_prefix: {
        Args: {
          name: string
        }
        Returns: string
      }
      get_prefixes: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

