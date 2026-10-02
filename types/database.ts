export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_usage: {
        Row: {
          action: string;
          created_at: string;
          credits: number;
          id: string;
          model: string | null;
          tokens_input: number;
          tokens_output: number;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          credits?: number;
          id?: string;
          model?: string | null;
          tokens_input?: number;
          tokens_output?: number;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          credits?: number;
          id?: string;
          model?: string | null;
          tokens_input?: number;
          tokens_output?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          sources: NonNullable<Json>;
          subject_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          sources?: NonNullable<Json>;
          subject_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          sources?: NonNullable<Json>;
          subject_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          fts: unknown;
          id: string;
          metadata: NonNullable<Json>;
          subject_id: string;
          token_count: number;
          user_id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          fts?: never;
          id?: string;
          metadata?: NonNullable<Json>;
          subject_id: string;
          token_count?: number;
          user_id: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          fts?: never;
          id?: string;
          metadata?: NonNullable<Json>;
          subject_id?: string;
          token_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_user_id_fkey";
            columns: ["document_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "document_chunks_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      documents: {
        Row: {
          chunk_count: number;
          created_at: string;
          error_message: string | null;
          extracted_text: string | null;
          file_path: string;
          file_size: number;
          file_type: string;
          id: string;
          name: string;
          page_count: number | null;
          status: string;
          subject_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chunk_count?: number;
          created_at?: string;
          error_message?: string | null;
          extracted_text?: string | null;
          file_path: string;
          file_size: number;
          file_type: string;
          id?: string;
          name: string;
          page_count?: number | null;
          status?: string;
          subject_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chunk_count?: number;
          created_at?: string;
          error_message?: string | null;
          extracted_text?: string | null;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          name?: string;
          page_count?: number | null;
          status?: string;
          subject_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      flashcard_reviews: {
        Row: {
          flashcard_id: string;
          id: string;
          interval_days: number | null;
          rating: string;
          reviewed_at: string;
          user_id: string;
        };
        Insert: {
          flashcard_id: string;
          id?: string;
          interval_days?: number | null;
          rating: string;
          reviewed_at?: string;
          user_id: string;
        };
        Update: {
          flashcard_id?: string;
          id?: string;
          interval_days?: number | null;
          rating?: string;
          reviewed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_user_id_fkey";
            columns: ["flashcard_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "flashcards";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      flashcards: {
        Row: {
          answer: string;
          created_at: string;
          difficulty: string;
          document_id: string | null;
          ease_factor: number;
          id: string;
          interval_days: number;
          lapses: number;
          last_reviewed_at: string | null;
          mastery_score: number;
          next_review_at: string;
          question: string;
          review_count: number;
          subject_id: string;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          difficulty?: string;
          document_id?: string | null;
          ease_factor?: number;
          id?: string;
          interval_days?: number;
          lapses?: number;
          last_reviewed_at?: string | null;
          mastery_score?: number;
          next_review_at?: string;
          question: string;
          review_count?: number;
          subject_id: string;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          difficulty?: string;
          document_id?: string | null;
          ease_factor?: number;
          id?: string;
          interval_days?: number;
          lapses?: number;
          last_reviewed_at?: string | null;
          mastery_score?: number;
          next_review_at?: string;
          question?: string;
          review_count?: number;
          subject_id?: string;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_document_id_user_id_fkey";
            columns: ["document_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "flashcards_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "flashcards_topic_id_user_id_fkey";
            columns: ["topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          daily_study_minutes: number;
          education_level: string | null;
          email: string | null;
          full_name: string | null;
          goal: string | null;
          id: string;
          language: string;
          next_exam_date: string | null;
          notification_preferences: NonNullable<Json>;
          onboarded_at: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          daily_study_minutes?: number;
          education_level?: string | null;
          email?: string | null;
          full_name?: string | null;
          goal?: string | null;
          id: string;
          language?: string;
          next_exam_date?: string | null;
          notification_preferences?: NonNullable<Json>;
          onboarded_at?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          daily_study_minutes?: number;
          education_level?: string | null;
          email?: string | null;
          full_name?: string | null;
          goal?: string | null;
          id?: string;
          language?: string;
          next_exam_date?: string | null;
          notification_preferences?: NonNullable<Json>;
          onboarded_at?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_answers: {
        Row: {
          answer: number | null;
          attempt_id: string;
          id: string;
          is_correct: boolean;
          question_id: string;
          user_id: string;
        };
        Insert: {
          answer?: number | null;
          attempt_id: string;
          id?: string;
          is_correct: boolean;
          question_id: string;
          user_id: string;
        };
        Update: {
          answer?: number | null;
          attempt_id?: string;
          id?: string;
          is_correct?: boolean;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_user_id_fkey";
            columns: ["attempt_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "quiz_answers_question_id_user_id_fkey";
            columns: ["question_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          completed_at: string | null;
          id: string;
          percentage: number;
          quiz_id: string;
          score: number;
          started_at: string;
          total: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          percentage?: number;
          quiz_id: string;
          score?: number;
          started_at?: string;
          total?: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          percentage?: number;
          quiz_id?: string;
          score?: number;
          started_at?: string;
          total?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_user_id_fkey";
            columns: ["quiz_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          choices: NonNullable<Json>;
          correct_answer: number;
          explanation: string;
          id: string;
          position: number;
          question: string;
          quiz_id: string;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          choices: NonNullable<Json>;
          correct_answer: number;
          explanation?: string;
          id?: string;
          position: number;
          question: string;
          quiz_id: string;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          choices?: NonNullable<Json>;
          correct_answer?: number;
          explanation?: string;
          id?: string;
          position?: number;
          question?: string;
          quiz_id?: string;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_user_id_fkey";
            columns: ["quiz_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "quiz_questions_topic_id_user_id_fkey";
            columns: ["topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      quizzes: {
        Row: {
          created_at: string;
          difficulty: string;
          id: string;
          question_count: number;
          subject_id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty: string;
          id?: string;
          question_count?: number;
          subject_id: string;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: string;
          id?: string;
          question_count?: number;
          subject_id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      study_plans: {
        Row: {
          created_at: string;
          daily_minutes: number;
          end_date: string;
          id: string;
          start_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_minutes: number;
          end_date: string;
          id?: string;
          start_date: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_minutes?: number;
          end_date?: string;
          id?: string;
          start_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          duration_minutes: number;
          id: string;
          kind: string;
          plan_id: string | null;
          position: number;
          scheduled_date: string;
          status: string;
          subject_id: string;
          title: string;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          duration_minutes: number;
          id?: string;
          kind: string;
          plan_id?: string | null;
          position?: number;
          scheduled_date: string;
          status?: string;
          subject_id: string;
          title: string;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          kind?: string;
          plan_id?: string | null;
          position?: number;
          scheduled_date?: string;
          status?: string;
          subject_id?: string;
          title?: string;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_plan_id_user_id_fkey";
            columns: ["plan_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_plans";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_sessions_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_sessions_topic_id_user_id_fkey";
            columns: ["topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      subjects: {
        Row: {
          color: string;
          created_at: string;
          description: string | null;
          exam_date: string | null;
          id: string;
          name: string;
          target_grade: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description?: string | null;
          exam_date?: string | null;
          id?: string;
          name: string;
          target_grade?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          description?: string | null;
          exam_date?: string | null;
          id?: string;
          name?: string;
          target_grade?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          id: string;
          status: string | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      summaries: {
        Row: {
          content: NonNullable<Json>;
          created_at: string;
          document_id: string | null;
          id: string;
          length: string;
          subject_id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          content: NonNullable<Json>;
          created_at?: string;
          document_id?: string | null;
          id?: string;
          length: string;
          subject_id: string;
          title: string;
          user_id: string;
        };
        Update: {
          content?: NonNullable<Json>;
          created_at?: string;
          document_id?: string | null;
          id?: string;
          length?: string;
          subject_id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "summaries_document_id_user_id_fkey";
            columns: ["document_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "summaries_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      topics: {
        Row: {
          attempts_count: number;
          correct_count: number;
          created_at: string;
          description: string | null;
          difficulty_score: number;
          id: string;
          last_studied_at: string | null;
          mastery_score: number;
          name: string;
          subject_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts_count?: number;
          correct_count?: number;
          created_at?: string;
          description?: string | null;
          difficulty_score?: number;
          id?: string;
          last_studied_at?: string | null;
          mastery_score?: number;
          name: string;
          subject_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts_count?: number;
          correct_count?: number;
          created_at?: string;
          description?: string | null;
          difficulty_score?: number;
          id?: string;
          last_studied_at?: string | null;
          mastery_score?: number;
          name?: string;
          subject_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      credits_used_since: { Args: { p_since: string }; Returns: number };
      match_document_chunks: {
        Args: {
          match_count?: number;
          min_similarity?: number;
          p_subject_id: string;
          query_embedding: string;
        };
        Returns: {
          chunk_index: number;
          content: string;
          document_id: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      reserve_ai_credits: {
        Args: {
          p_action: string;
          p_credits: number;
          p_limit: number;
          p_since: string;
          p_user_id: string;
        };
        Returns: string;
      };
      search_document_chunks: {
        Args: {
          match_count?: number;
          p_subject_id: string;
          query_text: string;
        };
        Returns: {
          chunk_index: number;
          content: string;
          document_id: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
