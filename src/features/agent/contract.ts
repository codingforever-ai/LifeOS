/**
 * Agent ↔ UI contract. The real Agent will operate through structured tools; the UI
 * renders these shapes regardless of where they come from (demo runner today, backend later).
 */
export type ToolRisk = 'read' | 'write';

export interface ToolCall {
  id: string;
  tool: string; // e.g. "calendar.move_event"
  title: string; // human summary
  risk: ToolRisk;
  args: { label: string; value: string }[];
}

export interface ToolResult {
  callId: string;
  ok: boolean;
  summary: string;
  details?: string[];
}

export type AgentMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'agent'; kind: 'text'; text: string }
  | { id: string; role: 'agent'; kind: 'proposal'; text: string; call: ToolCall; state: 'pending' | 'confirmed' | 'dismissed' }
  | { id: string; role: 'agent'; kind: 'result'; result: ToolResult };

/** An Agent backend implements this; swap `demoAgent` for a real one. */
export interface AgentBackend {
  respond(prompt: string): Promise<AgentMessage[]>;
  execute(call: ToolCall): Promise<ToolResult>;
  readonly isDemo: boolean;
}
