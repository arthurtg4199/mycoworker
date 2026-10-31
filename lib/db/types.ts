import type { Channel } from "@/lib/demo-data";

export type { Channel };

export type ConversationStatus =
  | "open"
  | "answered"
  | "hot"
  | "followed_up"
  | "your_turn"
  | "closed";

export type MessageRole = "user" | "assistant" | "owner";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  channel: Channel;
  phone: string | null;
  email: string | null;
  mood: string | null;
  happiness: number | null;
  ready_to_close: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  name: string;
  channel: Channel;
  phone?: string | null;
  email?: string | null;
  mood?: string | null;
  happiness?: number | null;
  ready_to_close?: boolean;
  notes?: string | null;
};

export type CustomerPatch = Partial<CustomerInput>;

export type Conversation = {
  id: string;
  user_id: string;
  customer_id: string;
  channel: Channel;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationInput = {
  customer_id: string;
  channel: Channel;
  status?: ConversationStatus;
};

export type ConversationPatch = {
  customer_id?: string;
  channel?: Channel;
  status?: ConversationStatus;
};

export type Message = {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type MessageInput = {
  chat_id: string;
  role: MessageRole;
  content: string;
};

export type Appointment = {
  id: string;
  user_id: string;
  customer_id: string;
  title: string;
  scheduled_at: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
};

export type AppointmentInput = {
  customer_id: string;
  title: string;
  scheduled_at: string;
  status?: AppointmentStatus;
};

export type AppointmentPatch = {
  customer_id?: string;
  title?: string;
  scheduled_at?: string;
  status?: AppointmentStatus;
};

export type Payment = {
  id: string;
  user_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentInput = {
  customer_id: string;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  confirmed_at?: string | null;
};

export type PaymentPatch = {
  customer_id?: string;
  amount?: number;
  currency?: string;
  status?: PaymentStatus;
  confirmed_at?: string | null;
};

export type WhatsAppTokenSource = "pasted" | "oauth" | "env";

export type WhatsAppConnectionStatus = "connected" | "disconnected";

export type WhatsAppIngestResult = {
  stored: boolean;
  duplicate?: boolean;
  reason?: string;
  chat_id?: string;
  customer_phone?: string;
  auto_reply?: boolean;
  hot?: boolean;
  access_token?: string | null;
  token_source?: string;
  phone_number_id?: string;
};

export type WhatsAppReplyContext = {
  phone_number_id: string;
  access_token: string | null;
  token_source: string;
  customer_phone: string | null;
  auto_reply: boolean;
  chat_status: string;
};

/** Latest message on a chat, for the inbox. Phone, email, and notes stay off this shape. */
export type ChatPreview = {
  id: string;
  customer_id: string;
  channel: Channel;
  status: ConversationStatus;
  last_message_at: string | null;
  updated_at: string;
  customer_name: string;
  ready_to_close: boolean;
  last_message: string | null;
};

type CustomerRow = {
  id: string;
  user_id: string;
  name: string;
  channel: Channel;
  phone: string | null;
  email: string | null;
  mood: string | null;
  happiness: number | null;
  ready_to_close: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationRow = {
  id: string;
  user_id: string;
  customer_id: string;
  channel: Channel;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  user_id: string;
  customer_id: string;
  title: string;
  scheduled_at: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

type WhatsAppConnectionRow = {
  id: string;
  user_id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  waba_id: string | null;
  business_name: string | null;
  access_token: string | null;
  token_source: WhatsAppTokenSource;
  ingest_token_hash: string | null;
  auto_reply: boolean;
  status: WhatsAppConnectionStatus;
  created_at: string;
  updated_at: string;
};

type WhatsAppReceiptRow = {
  wa_message_id: string;
  user_id: string;
  message_id: string | null;
  created_at: string;
};

type ChatPreviewRow = {
  id: string;
  user_id: string;
  customer_id: string;
  channel: Channel;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  ready_to_close: boolean;
  last_message: string | null;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      customers: Table<
        CustomerRow,
        {
          id?: string;
          user_id?: string;
          name: string;
          channel: Channel;
          phone?: string | null;
          email?: string | null;
          mood?: string | null;
          happiness?: number | null;
          ready_to_close?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          name?: string;
          channel?: Channel;
          phone?: string | null;
          email?: string | null;
          mood?: string | null;
          happiness?: number | null;
          ready_to_close?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      chats: Table<
        ConversationRow,
        {
          id?: string;
          user_id?: string;
          customer_id: string;
          channel: Channel;
          status?: ConversationStatus;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          customer_id?: string;
          channel?: Channel;
          status?: ConversationStatus;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      messages: Table<
        MessageRow,
        {
          id?: string;
          chat_id: string;
          role: MessageRole;
          content: string;
          created_at?: string;
        },
        {
          id?: string;
          chat_id?: string;
          role?: MessageRole;
          content?: string;
          created_at?: string;
        }
      >;
      appointments: Table<
        AppointmentRow,
        {
          id?: string;
          user_id?: string;
          customer_id: string;
          title: string;
          scheduled_at: string;
          status?: AppointmentStatus;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          customer_id?: string;
          title?: string;
          scheduled_at?: string;
          status?: AppointmentStatus;
          created_at?: string;
          updated_at?: string;
        }
      >;
      payments: Table<
        PaymentRow,
        {
          id?: string;
          user_id?: string;
          customer_id: string;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          customer_id?: string;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      whatsapp_connections: Table<
        WhatsAppConnectionRow,
        {
          id?: string;
          user_id?: string;
          phone_number_id: string;
          display_phone_number?: string | null;
          waba_id?: string | null;
          business_name?: string | null;
          access_token?: string | null;
          token_source: WhatsAppTokenSource;
          ingest_token_hash?: string | null;
          auto_reply?: boolean;
          status?: WhatsAppConnectionStatus;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          phone_number_id?: string;
          display_phone_number?: string | null;
          waba_id?: string | null;
          business_name?: string | null;
          access_token?: string | null;
          token_source?: WhatsAppTokenSource;
          ingest_token_hash?: string | null;
          auto_reply?: boolean;
          status?: WhatsAppConnectionStatus;
          created_at?: string;
          updated_at?: string;
        }
      >;
      whatsapp_receipts: Table<
        WhatsAppReceiptRow,
        {
          wa_message_id: string;
          user_id: string;
          message_id?: string | null;
          created_at?: string;
        },
        {
          wa_message_id?: string;
          user_id?: string;
          message_id?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: {
      chat_previews: {
        Row: ChatPreviewRow;
        Relationships: [];
      };
    };
    Functions: {
      mcw_ingest_whatsapp: {
        Args: {
          p_verify_token: string;
          p_phone_number_id: string;
          p_wa_message_id: string;
          p_from_phone: string;
          p_profile_name: string;
          p_body: string;
          p_hot: boolean;
        };
        Returns: WhatsAppIngestResult;
      };
      mcw_record_whatsapp_outbound: {
        Args: {
          p_verify_token: string;
          p_chat_id: string;
          p_content: string;
          p_status: string;
        };
        Returns: { stored: boolean; reason?: string };
      };
      mcw_whatsapp_reply_context: {
        Args: { p_chat_id: string };
        Returns: WhatsAppReplyContext[];
      };
    };
  };
};
