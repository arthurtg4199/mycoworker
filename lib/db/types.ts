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
    };
    Views: {
      chat_previews: {
        Row: ChatPreviewRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
};
