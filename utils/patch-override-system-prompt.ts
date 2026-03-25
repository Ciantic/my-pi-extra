import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentSession } from "./patch-get-agent-session";

export function setupSystemPromptOverrider(pi: ExtensionAPI) {
  let systemPromptOverride = "";
  pi.on("before_agent_start", (e, ctx) => {
    let agentSession = getAgentSession();
    // Notice: way the pi-coding-agent uses `setSystemPrompt` it is not possible
    // to simply call `agentSession.agent.setSystemPrompt`, the rebuildSystemPrompt
    // mechanism overrides it. See
    // https://github.com/badlogic/pi-mono/blob/21950c5ba434fcbd2f29f1264b329da0b130082d/packages/coding-agent/src/core/agent-session.ts#L2039
    // @ts-ignore
    if (agentSession.agent.setSystemPrompt._isOverridden) {
      return;
    }
    let oldSetSystemPrompt = agentSession.agent.setSystemPrompt;
    agentSession.agent.setSystemPrompt = function (newPrompt: string) {
      oldSetSystemPrompt.call(this, systemPromptOverride || newPrompt);
    };
    // @ts-ignore
    agentSession.agent.setSystemPrompt._isOverridden = true;
  });

  return {
    get: () => systemPromptOverride,
    set: (newPrompt: string) => {
      systemPromptOverride = newPrompt;
    },
  };
}
