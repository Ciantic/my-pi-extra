import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export function setupSystemPromptOverrider(pi: ExtensionAPI) {
  let has_before_agent_executed = false;
  let system_prompt_override = "";
  pi.on("before_agent_start", (e, ctx) => {
    has_before_agent_executed = true;
    if (system_prompt_override) {
      return {
        systemPrompt: system_prompt_override,
      };
    }
  });

  return {
    effective: () => has_before_agent_executed,
    get: () => system_prompt_override,
    set: (newPrompt: string) => {
      system_prompt_override = newPrompt;
    },
  };
}
