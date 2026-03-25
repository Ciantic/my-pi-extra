import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { AgentSession } from "@mariozechner/pi-coding-agent";

let agentSession: AgentSession;

// My why, there is no better way?
// @ts-ignore
const _old = AgentSession.prototype._installAgentToolHooks;
// @ts-ignore
AgentSession.prototype._installAgentToolHooks = function () {
  agentSession = this;
  // @ts-ignore
  return _old.apply(this, arguments);
};

export default function (pi: ExtensionAPI) {
  pi.registerCommand(".export", {
    async handler(args, ctx) {
      const input = await ctx.ui.input("Enter file path to export:");
      const HOME = process.env.HOME || "~";
      try {
        await agentSession.exportToHtml(`${HOME}/pichats/${input}.html`);
        agentSession.exportToJsonl(`${HOME}/pichats/${input}.jsonl`);
        ctx.ui.notify(`Exported to ${HOME}/pichats/${input}.html and .jsonl`);
      } catch (error) {
        ctx.ui.notify(
          `Export failed, maybe session has not started? ${JSON.stringify(error, null, 2)}`,
        );
      }
    },
    description: "Export to my chats directory",
  });

  pi.registerCommand(".sequential", {
    async handler(args, ctx) {
      agentSession.agent.setToolExecution("sequential");
      ctx.ui.notify("Tool execution set to sequential");
    },
    description: "Set tool execution to sequential",
  });

  pi.registerCommand(".parallel", {
    async handler(args, ctx) {
      agentSession.agent.setToolExecution("parallel");
      ctx.ui.notify("Tool execution set to parallel");
    },
    description: "Set tool execution to parallel",
  });
}
