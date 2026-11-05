import type { Chat } from "@/lib/demo-data";
import type { WorkspaceView } from "@/lib/db/inbox";
import {
  scoreCustomerMood,
  type Mood,
  type MoodMessage,
} from "@/lib/mood";

export type CustomerLine = {
  chatId: string;
  content: string;
  role?: string | null;
  at?: string | null;
};

function upsetFirst(chats: Chat[]) {
  return [...chats].sort(
    (a, b) => Number(a.mood !== "upset") - Number(b.mood !== "upset"),
  );
}

function messagesFor(
  chat: Chat,
  lines: readonly CustomerLine[],
): (string | MoodMessage)[] {
  if (lines.length === 0) return [chat.preview];
  return lines.map((line) => ({
    content: line.content,
    role: line.role,
    at: line.at,
  }));
}

/**
 * Scores each chat from recent customer lines, or from the preview when a
 * chat has none. Upset customers float to the top so the owner can reply first.
 * Nothing is written to customers.mood. That column already exists.
 */
export function applyMood(
  workspace: WorkspaceView,
  lines: readonly CustomerLine[] = [],
  now?: Date,
  apiKey?: string | null,
): WorkspaceView {
  const byChat = new Map<string, CustomerLine[]>();
  for (const line of lines) {
    const list = byChat.get(line.chatId);
    if (list) list.push(line);
    else byChat.set(line.chatId, [line]);
  }

  const scoreChat = (chat: Chat): Chat => ({
    ...chat,
    mood: scoreCustomerMood(
      messagesFor(chat, byChat.get(chat.id) ?? []),
      now,
      apiKey,
    ).mood,
  });

  const chats = upsetFirst(workspace.chats.map(scoreChat));
  const moodById = new Map<string, Mood | undefined>(
    chats.map((chat) => [chat.id, chat.mood]),
  );
  const buyers = upsetFirst(
    workspace.buyers.map((buyer) => {
      const known = moodById.get(buyer.id);
      if (known) return { ...buyer, mood: known };
      return scoreChat(buyer);
    }),
  );
  const signals = workspace.signals.map((signal) => {
    const fromChat = signal.chatId ? moodById.get(signal.chatId) : undefined;
    return {
      ...signal,
      mood:
        fromChat ??
        scoreCustomerMood([signal.preview], now, apiKey).mood,
    };
  });

  return { ...workspace, chats, buyers, signals };
}
