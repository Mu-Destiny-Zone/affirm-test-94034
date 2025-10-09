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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          entity: string
          entity_id: string
          id: string
          meta: Json | null
          org_id: string
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          entity: string
          entity_id: string
          id?: string
          meta?: Json | null
          org_id: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          entity?: string
          entity_id?: string
          id?: string
          meta?: Json | null
          org_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          duplicate_of: string | null
          fix_notes: string | null
          id: string
          org_id: string
          project_id: string | null
          reporter_id: string
          repro_steps: Json | null
          severity: Database["public"]["Enums"]["bug_severity"] | null
          status: Database["public"]["Enums"]["bug_status"] | null
          tags: string[] | null
          test_id: string | null
          title: string
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duplicate_of?: string | null
          fix_notes?: string | null
          id?: string
          org_id: string
          project_id?: string | null
          reporter_id: string
          repro_steps?: Json | null
          severity?: Database["public"]["Enums"]["bug_severity"] | null
          status?: Database["public"]["Enums"]["bug_status"] | null
          tags?: string[] | null
          test_id?: string | null
          title: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duplicate_of?: string | null
          fix_notes?: string | null
          id?: string
          org_id?: string
          project_id?: string | null
          reporter_id?: string
          repro_steps?: Json | null
          severity?: Database["public"]["Enums"]["bug_severity"] | null
          status?: Database["public"]["Enums"]["bug_status"] | null
          tags?: string[] | null
          test_id?: string | null
          title?: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "test_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          deleted_at: string | null
          id: string
          mentions: string[] | null
          org_id: string
          project_id: string | null
          reactions: Json | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          mentions?: string[] | null
          org_id: string
          project_id?: string | null
          reactions?: Json | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          mentions?: string[] | null
          org_id?: string
          project_id?: string | null
          reactions?: Json | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          org_id: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          org_id: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          org_id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          org_id: string
          project_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          org_id: string
          project_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          org_id?: string
          project_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          org_id: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orgs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          email: string | null
          id: string
          locale: Database["public"]["Enums"]["locale_type"] | null
          theme: Database["public"]["Enums"]["theme_type"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          locale?: Database["public"]["Enums"]["locale_type"] | null
          theme?: Database["public"]["Enums"]["theme_type"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_type"] | null
          theme?: Database["public"]["Enums"]["theme_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          profile_id: string
          project_id: string
          role_override: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          profile_id: string
          project_id: string
          role_override?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          profile_id?: string
          project_id?: string
          role_override?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          owner_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          owner_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          owner_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          author_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          impact: Database["public"]["Enums"]["suggestion_impact"] | null
          org_id: string
          project_id: string | null
          status: Database["public"]["Enums"]["suggestion_status"] | null
          tags: string[] | null
          test_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["suggestion_impact"] | null
          org_id: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          tags?: string[] | null
          test_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["suggestion_impact"] | null
          org_id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          tags?: string[] | null
          test_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_assignments: {
        Row: {
          assignee_id: string
          created_at: string | null
          deleted_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          org_id: string
          project_id: string | null
          state: Database["public"]["Enums"]["assignment_state"] | null
          step_results: Json | null
          test_id: string
          updated_at: string | null
        }
        Insert: {
          assignee_id: string
          created_at?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          project_id?: string | null
          state?: Database["public"]["Enums"]["assignment_state"] | null
          step_results?: Json | null
          test_id: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string
          created_at?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          project_id?: string | null
          state?: Database["public"]["Enums"]["assignment_state"] | null
          step_results?: Json | null
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          org_id: string
          priority: number | null
          project_id: string | null
          status: Database["public"]["Enums"]["test_status"] | null
          steps: Json | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          org_id: string
          priority?: number | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["test_status"] | null
          steps?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          priority?: number | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["test_status"] | null
          steps?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          user_id: string
          vote_type: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          user_id: string
          vote_type: boolean
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          user_id?: string
          vote_type?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_org_member: {
        Args: {
          p_org_id: string
          p_profile_id: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      is_org_admin: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { project_id: string }
        Returns: boolean
      }
      org_role: {
        Args: { org_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      project_role: {
        Args: { project_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      remove_user_from_all_managed_orgs: {
        Args: { p_profile_id: string }
        Returns: number
      }
      soft_delete_test: {
        Args: { test_id: string }
        Returns: undefined
      }
      soft_remove_org_member: {
        Args: { p_org_id: string; p_profile_id: string }
        Returns: undefined
      }
      update_org_member_role: {
        Args: {
          p_org_id: string
          p_profile_id: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "tester" | "viewer"
      assignment_state: "assigned" | "in_progress" | "blocked" | "done"
      bug_severity: "low" | "medium" | "high" | "critical"
      bug_status:
        | "new"
        | "triaged"
        | "in_progress"
        | "fixed"
        | "won't_fix"
        | "duplicate"
        | "closed"
      locale_type: "en" | "bg"
      suggestion_impact: "low" | "medium" | "high"
      suggestion_status: "new" | "consider" | "planned" | "done" | "rejected"
      target_type: "bug" | "suggestion" | "test"
      test_status: "draft" | "active" | "archived"
      theme_type: "dark" | "light" | "system"
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
  public: {
    Enums: {
      app_role: ["admin", "manager", "tester", "viewer"],
      assignment_state: ["assigned", "in_progress", "blocked", "done"],
      bug_severity: ["low", "medium", "high", "critical"],
      bug_status: [
        "new",
        "triaged",
        "in_progress",
        "fixed",
        "won't_fix",
        "duplicate",
        "closed",
      ],
      locale_type: ["en", "bg"],
      suggestion_impact: ["low", "medium", "high"],
      suggestion_status: ["new", "consider", "planned", "done", "rejected"],
      target_type: ["bug", "suggestion", "test"],
      test_status: ["draft", "active", "archived"],
      theme_type: ["dark", "light", "system"],
    },
  },
} as const
