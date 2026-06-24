import { appConfig } from "@/lib/config";

export type ToolCall = { id: string; function: { name: string; arguments: string } };
export type ChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

/** Flexible DeepSeek call supporting tool-calling and JSON mode, for the agent loop. */
export async function agentLLM(params: {
  messages: ChatMessage[];
  tools?: unknown[];
  json?: boolean;
}): Promise<ChatMessage> {
  if (!appConfig.deepseekApiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }
  const body: Record<string, unknown> = {
    model: "deepseek-chat",
    messages: params.messages,
    temperature: 0.2
  };
  if (params.tools) {
    body.tools = params.tools;
    body.tool_choice = "auto";
  }
  if (params.json) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appConfig.deepseekApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data?.choices?.[0]?.message) {
    throw new Error(`DeepSeek error: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.choices[0].message as ChatMessage;
}
