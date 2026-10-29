export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantReply {
  reply: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export const assistantApi = {
  async chat(
    message: string,
    history: AssistantHistoryMessage[]
  ): Promise<AssistantReply> {
    const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Assistant request failed (${response.status})`
      );
    }

    return response.json() as Promise<AssistantReply>;
  },
};