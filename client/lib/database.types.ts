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
          query?: string
          operationName?: string
          extensions?: Json
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
        ]
      }
      activity_log_archive: {
        Row: {
          action: string
          archived_at: string
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
          archived_at?: string
          created_at: string
          details?: Json | null
          id: string
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          field_id: string
          id?: string
          org_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          field_id?: string
          id?: string
          org_id?: string
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
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          org_id: string
          party_type: Database["public"]["Enums"]["party"]
          session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          org_id?: string
          party_type?: Database["public"]["Enums"]["party"]
          session_id?: string
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
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          org_id: string
          show_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          show_id?: string
          title?: string
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
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          slug?: string | null
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
      calendar_sync_runs: {
        Row: {
          created_at: string
          events_processed: number | null
          finished_at: string | null
          id: string
          message: string | null
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          events_processed?: number | null
          finished_at?: string | null
          id?: string
          message?: string | null
          source_id: string
          started_at?: string
          status: string
        }
        Update: {
          created_at?: string
          events_processed?: number | null
          finished_at?: string | null
          id?: string
          message?: string | null
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "calendar_sync_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_sources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          org_id: string
          source_name: string | null
          source_url: string
          status: string
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          org_id: string
          source_name?: string | null
          source_url: string
          status?: string
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          org_id?: string
          source_name?: string | null
          source_url?: string
          status?: string
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "calendar_sync_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "contact_commissions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_commissions_show_id_fkey"
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
          tsv: unknown | null
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
          tsv?: unknown | null
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
          tsv?: unknown | null
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
      import_jobs: {
        Row: {
          confidence_map: Json | null
          created_at: string | null
          duplicate_matches: Json | null
          errors: Json | null
          extracted_artist: string | null
          extraction_mode: string | null
          id: string
          normalized_text: string | null
          org_id: string
          parsed_json: Json | null
          previous_attempts: Json | null
          raw_text: string | null
          source_file_metadata: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          confidence_map?: Json | null
          created_at?: string | null
          duplicate_matches?: Json | null
          errors?: Json | null
          extracted_artist?: string | null
          extraction_mode?: string | null
          id?: string
          normalized_text?: string | null
          org_id: string
          parsed_json?: Json | null
          previous_attempts?: Json | null
          raw_text?: string | null
          source_file_metadata?: Json | null
          status: string
          updated_at?: string | null
        }
        Update: {
          confidence_map?: Json | null
          created_at?: string | null
          duplicate_matches?: Json | null
          errors?: Json | null
          extracted_artist?: string | null
          extraction_mode?: string | null
          id?: string
          normalized_text?: string | null
          org_id?: string
          parsed_json?: Json | null
          previous_attempts?: Json | null
          raw_text?: string | null
          source_file_metadata?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "import_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      parsed_contracts: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          error: string | null
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          org_id: string
          parsed_data: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          org_id: string
          parsed_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          parsed_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          confidence: number | null
          created_at: string
          created_by: string | null
          error: string | null
          from_email: string | null
          id: string
          org_id: string
          parsed_data: Json | null
          raw_content: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          show_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          from_email?: string | null
          id?: string
          org_id: string
          parsed_data?: Json | null
          raw_content?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          from_email?: string | null
          id?: string
          org_id?: string
          parsed_data?: Json | null
          raw_content?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_id?: string | null
          status?: string
          subject?: string | null
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
          {
            foreignKeyName: "parsed_emails_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_emails_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
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
      promoters: {
        Row: {
          city: string | null
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
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
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
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
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
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_seat_usage"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "promoters_org_id_fkey"
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
          sync_run_id: string | null
          title: string
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
          sync_run_id?: string | null
          title: string
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
          sync_run_id?: string | null
          title?: string
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
          {
            foreignKeyName: "schedule_items_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "calendar_sync_runs"
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
          role: Database["public"]["Enums"]["show_collab_role"]
          show_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["show_collab_role"]
          show_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["show_collab_role"]
          show_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
            foreignKeyName: "venue_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "shows_list_view"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_promoters: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          promoter_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          promoter_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          promoter_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_promoters_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
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
          tsv: unknown | null
          updated_at: string
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
          tsv?: unknown | null
          updated_at?: string
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
          tsv?: unknown | null
          updated_at?: string
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
        Args: {
          p_token: string
          p_user_id: string
        }
        Returns: Json
      }
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
          p_plan_id?: string
          p_status?: string
          p_extend_days?: number
          p_org_id: string
        }
        Returns: undefined
      }
      app_add_show_collaborator: {
        Args: {
          p_show_id: string
          p_user_id: string
          p_role?: Database["public"]["Enums"]["show_collab_role"]
        }
        Returns: string
      }
      app_assign_plan_debug: {
        Args: {
          p_org_id: string
          p_trial_days?: number
          p_plan_id: string
        }
        Returns: undefined
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
      app_create_show: {
        Args: {
          p_org_id: string
          p_title: string
          p_date: string
          p_venue_city?: string
          p_venue_id?: string
          p_venue_address?: string
          p_set_time?: string
          p_notes?: string
          p_venue_name?: string
        }
        Returns: Json
      }
      app_log_activity: {
        Args: {
          p_org_id: string
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      app_upload_file: {
        Args: {
          p_party_type?: string
          bucket_name: string
          file_path: string
          p_org_id: string
          p_show_id?: string
          p_session_id?: string
          p_document_id?: string
          p_field_id?: string
          p_original_name?: string
          p_content_type?: string
          p_size_bytes?: number
        }
        Returns: Json
      }
      archive_old_activity_logs: {
        Args: {
          days_to_keep?: number
          batch_size?: number
        }
        Returns: Json
      }
      assign_person_to_show: {
        Args: {
          p_show_id: string
          p_duty?: string
          p_person_id: string
        }
        Returns: Json
      }
      auto_downgrade_expired_orgs: {
        Args: Record<PropertyKey, never>
        Returns: {
          previous_plan: string
          org_id: string
          action: string
        }[]
      }
      bulk_update_show_dates: {
        Args: {
          p_updates: Json
        }
        Returns: Json
      }
      can_person_get_user_access: {
        Args: {
          p_person_id: string
        }
        Returns: Json
      }
      check_available_seats: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      check_maintenance_needed: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_org_limits_detailed: {
        Args: {
          p_check_type: string
          p_org_id: string
          p_additional_count?: number
        }
        Returns: Json
      }
      check_org_membership: {
        Args: {
          p_user_id: string
          p_org_id: string
        }
        Returns: boolean
      }
      check_slug_available: {
        Args: {
          slug_to_check: string
        }
        Returns: boolean
      }
      check_storage_org_access: {
        Args: {
          p_org_id: string
        }
        Returns: boolean
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
          storage_path: string
          reason: string
          cleaned_file_id: string
        }[]
      }
      create_advancing_document: {
        Args: {
          p_party_type: string
          p_session_id: string
          p_label?: string
        }
        Returns: Json
      }
      create_advancing_field: {
        Args: {
          p_section: string
          p_session_id: string
          p_field_name: string
          p_field_type: string
          p_party_type: string
          p_value?: Json
          p_sort_order?: number
        }
        Returns: Json
      }
      create_advancing_session: {
        Args: {
          p_org_id: string
          p_show_id: string
          p_title?: string
        }
        Returns: Json
      }
      create_calendar_sync_run: {
        Args: {
          p_org_id: string
          p_status: string
          p_message?: string
          p_events_processed?: number
          p_source_id: string
        }
        Returns: string
      }
      create_calendar_sync_source: {
        Args: {
          p_created_by: string
          p_org_id: string
          p_sync_interval_minutes: number
          p_source_name?: string
          p_source_url: string
        }
        Returns: string
      }
      create_person: {
        Args: {
          p_email?: string
          p_org_id: string
          p_name: string
          p_phone?: string
          p_role_title?: string
          p_notes?: string
          p_member_type?: Database["public"]["Enums"]["member_type"]
        }
        Returns: Json
      }
      debug_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      delete_advancing_document: {
        Args: {
          p_document_id: string
        }
        Returns: Json
      }
      delete_advancing_file: {
        Args: {
          p_file_id: string
        }
        Returns: Json
      }
      delete_calendar_sync_source: {
        Args: {
          p_source_id: string
          p_org_id: string
        }
        Returns: undefined
      }
      get_activity_log_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_activity_logs: {
        Args: {
          p_org_id: string
          p_limit?: number
          p_offset?: number
          p_include_archived?: boolean
        }
        Returns: {
          ip_address: unknown
          is_archived: boolean
          created_at: string
          user_agent: string
          id: string
          org_id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          details: Json
        }[]
      }
      get_advancing_documents: {
        Args: {
          p_session_id: string
        }
        Returns: Json
      }
      get_advancing_fields: {
        Args: {
          p_session_id: string
        }
        Returns: {
          created_at: string
          field_type: string
          party_type: Database["public"]["Enums"]["party"]
          value: Json
          status: Database["public"]["Enums"]["field_status"]
          sort_order: number
          created_by: string
          org_id: string
          field_id: string
          session_id: string
          section: string
          field_name: string
        }[]
      }
      get_advancing_session: {
        Args: {
          p_session_id: string
        }
        Returns: Json
      }
      get_advancing_session_details: {
        Args: {
          p_session_id: string
        }
        Returns: Json
      }
      get_available_people: {
        Args: {
          p_org_id: string
          p_party_type?: string
        }
        Returns: {
          id: string
          name: string
          member_type: Database["public"]["Enums"]["member_type"]
          email: string
          phone: string
        }[]
      }
      get_calendar_sync_runs: {
        Args: {
          p_org_id: string
        }
        Returns: {
          finished_at: string
          id: string
          source_id: string
          status: string
          started_at: string
          message: string
          events_processed: number
          created_at: string
          source_url: string
          source_name: string
          source_status: string
        }[]
      }
      get_calendar_sync_source: {
        Args: {
          p_source_id: string
          p_org_id: string
        }
        Returns: {
          id: string
          org_id: string
          source_url: string
          sync_interval_minutes: number
          updated_at: string
          last_error: string
          last_synced_at: string
          status: string
          created_by: string
          created_at: string
        }[]
      }
      get_calendar_sync_sources: {
        Args: {
          p_org_id: string
        }
        Returns: {
          updated_at: string
          last_synced_at: string
          status: string
          sync_interval_minutes: number
          source_url: string
          id: string
          org_id: string
          created_at: string
          last_error: string
          created_by: string
        }[]
      }
      get_invitation_by_token: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
      get_maintenance_stats: {
        Args: {
          days_back?: number
        }
        Returns: Json
      }
      get_org_advancing_sessions: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_by_id: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_by_slug: {
        Args: {
          p_slug: string
        }
        Returns: Json
      }
      get_org_invitations: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_membership: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_people: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_promoters: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_subscription: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_org_venues_with_counts: {
        Args: {
          p_org_id: string
        }
        Returns: {
          id: string
          name: string
          address: string
          city: string
          country: string
          capacity: number
          created_at: string
          updated_at: string
          shows_count: number
          org_id: string
        }[]
      }
      get_parsed_contracts: {
        Args: {
          p_org_id: string
        }
        Returns: {
          notes: string
          id: string
          org_id: string
          file_name: string
          file_url: string
          parsed_data: Json
          status: string
          confidence: number
          created_by: string
          reviewed_by: string
          reviewed_at: string
          error: string
          created_at: string
          updated_at: string
        }[]
      }
      get_parsed_email_by_id: {
        Args: {
          p_email_id: string
        }
        Returns: {
          created_by: string
          show_id: string
          id: string
          from_email: string
          raw_content: string
          parsed_data: Json
          status: string
          confidence: number
          org_id: string
          subject: string
          updated_at: string
          error: string
          created_at: string
          reviewed_at: string
          reviewed_by: string
        }[]
      }
      get_parsed_emails: {
        Args: {
          p_org_id: string
        }
        Returns: {
          reviewed_at: string
          reviewed_by: string
          created_by: string
          show_id: string
          error: string
          confidence: number
          status: string
          parsed_data: Json
          raw_content: string
          from_email: string
          subject: string
          org_id: string
          id: string
          updated_at: string
          created_at: string
        }[]
      }
      get_promoters_by_venue: {
        Args: {
          p_venue_id: string
        }
        Returns: Json
      }
      get_show_by_id: {
        Args: {
          p_show_id: string
        }
        Returns: Json
      }
      get_show_stats: {
        Args: {
          p_org_id: string
        }
        Returns: Json
      }
      get_show_team: {
        Args: {
          p_party_type?: string
          p_show_id: string
        }
        Returns: {
          email: string
          member_type: Database["public"]["Enums"]["member_type"]
          name: string
          id: string
          duty: string
          phone: string
        }[]
      }
      get_shows_by_org: {
        Args: {
          p_org_id: string
        }
        Returns: {
          created_at: string
          id: string
          org_id: string
          title: string
          date: string
          venue_id: string
          set_time: string
          doors_at: string
          notes: string
          status: string
          updated_at: string
          venue_name: string
          venue_city: string
          venue_address: string
        }[]
      }
      get_sync_run_items: {
        Args: {
          p_sync_run_id: string
        }
        Returns: {
          starts_at: string
          id: string
          title: string
          ends_at: string
          location: string
          notes: string
          external_calendar_id: string
          created_at: string
        }[]
      }
      get_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_orgs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_venue_details: {
        Args: {
          p_venue_id: string
        }
        Returns: Json
      }
      has_show_access: {
        Args: {
          p_show: string
          min_role: string
        }
        Returns: boolean
      }
      import_calendar_events: {
        Args: {
          p_sync_run_id?: string
          p_org_id: string
          p_events: Json
        }
        Returns: {
          total: number
          updated: number
          inserted: number
        }[]
      }
      insert_parsed_email: {
        Args: {
          p_confidence: number
          p_created_by: string
          p_error?: string
          p_org_id: string
          p_subject: string
          p_from_email: string
          p_raw_content: string
          p_parsed_data: Json
          p_status: string
        }
        Returns: string
      }
      is_org_editor: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      is_org_editor_and_active: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      is_org_editor_for_contact: {
        Args: {
          p_org_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      is_org_member_and_active: {
        Args: {
          p_org: string
        }
        Returns: boolean
      }
      is_org_member_for_contact: {
        Args: {
          p_org_id: string
        }
        Returns: boolean
      }
      is_supabase_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_billing_action: {
        Args: {
          p_action: string
          p_user_id?: string
          p_details?: Json
          p_org_id: string
        }
        Returns: string
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
      remove_person_from_show: {
        Args: {
          p_person_id: string
          p_show_id: string
        }
        Returns: undefined
      }
      rename_advancing_file: {
        Args: {
          p_file_id: string
          p_new_name: string
        }
        Returns: Json
      }
      run_analyze_all_tables: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      run_analyze_with_logging: {
        Args: {
          triggered_by?: string
        }
        Returns: Json
      }
      run_scheduled_log_archival: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      run_vacuum_all_tables: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      run_vacuum_with_logging: {
        Args: {
          triggered_by?: string
        }
        Returns: Json
      }
      save_advancing_grid_data: {
        Args: {
          p_grid_data: Json
          p_session_id: string
          p_org_id: string
          p_party_type?: string
          p_grid_type: string
        }
        Returns: Json
      }
      search_promoters: {
        Args: {
          p_query?: string
          p_org_id: string
        }
        Returns: Json
      }
      test_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_advancing_document: {
        Args: {
          p_document_id: string
          p_label: string
        }
        Returns: Json
      }
      update_advancing_field: {
        Args: {
          p_session_id: string
          p_field_id: string
          p_value: Json
        }
        Returns: Json
      }
      update_calendar_source_sync_metadata: {
        Args: {
          p_last_synced_at?: string
          p_org_id: string
          p_source_id: string
          p_last_error?: string
        }
        Returns: undefined
      }
      update_calendar_sync_run_status: {
        Args: {
          p_events_processed: number
          p_message: string
          p_status: string
          p_run_id: string
        }
        Returns: undefined
      }
      update_calendar_sync_source:
        | {
            Args: {
              p_source_url?: string
              p_status?: string
              p_sync_interval_minutes?: number
              p_org_id: string
              p_source_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_status: string
              p_source_id: string
              p_source_url: string
              p_sync_interval_minutes: number
              p_source_name?: string
            }
            Returns: undefined
          }
      update_parsed_email_status: {
        Args: {
          p_show_id?: string
          p_error?: string
          p_reviewed_by: string
          p_status: string
          p_email_id: string
          p_org_id: string
        }
        Returns: boolean
      }
      upload_advancing_file: {
        Args: {
          p_document_id: string
          p_content_type: string
          p_size_bytes: number
          p_original_name: string
          p_storage_path: string
        }
        Returns: Json
      }
      uuid_generate_v1: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v1mc: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v3: {
        Args: {
          namespace: string
          name: string
        }
        Returns: string
      }
      uuid_generate_v4: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v5: {
        Args: {
          name: string
          namespace: string
        }
        Returns: string
      }
      uuid_nil: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_dns: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_oid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_x500: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      verify_storage_metadata: {
        Args: {
          hours_back?: number
        }
        Returns: {
          file_id: string
          requires_edge_function: boolean
          verification_status: string
          expected_metadata: Json
          storage_path: string
        }[]
      }
    }
    Enums: {
      field_status: "pending" | "confirmed"
      member_type: "Artist" | "Crew" | "Agent" | "Manager"
      org_role: "owner" | "admin" | "editor" | "viewer"
      party: "from_us" | "from_you"
      show_collab_role: "promoter_editor" | "promoter_viewer"
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
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
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
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
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
          _name: string
          _bucket_id: string
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
      delete_leaf_prefixes: {
        Args: {
          bucket_ids: string[]
          names: string[]
        }
        Returns: undefined
      }
      delete_prefix: {
        Args: {
          _name: string
          _bucket_id: string
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
          id: string
          key: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          next_token?: string
          start_after?: string
          max_keys?: number
          delimiter_param: string
          prefix_param: string
          bucket_id: string
        }
        Returns: {
          updated_at: string
          metadata: Json
          id: string
          name: string
        }[]
      }
      lock_top_prefixes: {
        Args: {
          bucket_ids: string[]
          names: string[]
        }
        Returns: undefined
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          search?: string
          sortcolumn?: string
          sortorder?: string
          levels?: number
          offsets?: number
          limits?: number
          prefix: string
          bucketname: string
        }
        Returns: {
          created_at: string
          name: string
          id: string
          last_accessed_at: string
          metadata: Json
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          limits?: number
          levels?: number
          sortorder?: string
          sortcolumn?: string
          search?: string
          offsets?: number
          prefix: string
          bucketname: string
        }
        Returns: {
          metadata: Json
          last_accessed_at: string
          created_at: string
          updated_at: string
          id: string
          name: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          prefix: string
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
          sort_column_after?: string
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
          sort_order?: string
          sort_column?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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

