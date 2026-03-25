import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { AgentSession } from "@mariozechner/pi-coding-agent";

let agentSession: AgentSession;

// My why, there is no better way? PI Extension API has no way to get
// AgentSession instance, so I monkey patched myself to get the instance.
//
// I tried how many times this AgentSession is initiated during interactive PI
// session. It seems like it is only initiated once. I tried /new and /tree,
// when navigating or creating a new session it was still initiated only once.
// It acts like a singleton.
//
// @ts-ignore
const _old = AgentSession.prototype._installAgentToolHooks;
// @ts-ignore
AgentSession.prototype._installAgentToolHooks = function () {
  agentSession = this;
  // @ts-ignore
  return _old.apply(this, arguments);
};

export default function (pi: ExtensionAPI) {
  let systemPromptOverride = "";
  pi.on("before_agent_start", (e, ctx) => {
    // Notice: way the pi-coding-agent uses `setSystemPrompt` it is not possible
    // to simply call `agentSession.agent.setSystemPrompt`, the rebuildSystemPrompt
    // mechanism overrides it. See
    // https://github.com/badlogic/pi-mono/blob/21950c5ba434fcbd2f29f1264b329da0b130082d/packages/coding-agent/src/core/agent-session.ts#L2039
    let oldSetSystemPrompt = agentSession.agent.setSystemPrompt;
    agentSession.agent.setSystemPrompt = function (newPrompt: string) {
      if (systemPromptOverride) {
        ctx.ui.notify("Overriding system prompt with: " + systemPromptOverride);
      }
      oldSetSystemPrompt.call(this, systemPromptOverride || newPrompt);
    };
  });

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

  pi.registerCommand(".get", {
    async handler(args, ctx) {
      ctx.ui.notify(
        "Current system prompt: \n\n" +
          (systemPromptOverride || ctx.getSystemPrompt()),
      );
    },
    description: "Get system prompt",
  });

  pi.registerCommand(".set", {
    async handler(args, ctx) {
      const newPrompt =
        args.length === 0
          ? await ctx.ui.input(
              "Enter new system prompt",
              "Write a system prompt",
              {},
            )
          : args;

      if (!newPrompt) {
        ctx.ui.notify("System prompt reset to default");
        systemPromptOverride = "";
        return;
      } else {
        systemPromptOverride = newPrompt;
        ctx.ui.notify("System prompt override updated");
      }
    },
    description: "Set system prompt",
  });

  pi.registerCommand(".no-tools", {
    async handler(args, ctx) {
      agentSession.setActiveToolsByName([]);
    },
    description: "Set tools to none",
  });
}
