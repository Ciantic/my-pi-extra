import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentSession } from "../utils/patch-get-agent-session";
import { setupSystemPromptOverrider } from "../utils/override-system-prompt";

export default function (pi: ExtensionAPI) {
  const systemPromptOverride = setupSystemPromptOverrider(pi);

  // Get the payload sent to the provider for the most recent provider request,
  // for debugging and insight into what the agent is doing
  let lastProviderRequest: any = {};
  pi.on("before_provider_request", (e, ctx) => {
    lastProviderRequest = e;
  });
  pi.registerCommand(".provider-request", {
    async handler(args, ctx) {
      if (Object.keys(lastProviderRequest).length === 0) {
        ctx.ui.notify("No provider requests logged yet");
        return;
      }
      ctx.ui.notify(
        "Logged provider requests: \n\n" +
          JSON.stringify(lastProviderRequest, null, 2),
      );
    },
    description: "Show last provider request",
  });

  // Export the current session to HTML and JSONL in the user's home directory
  // under pichats folder, with a filename provided as argument or prompted for
  // input
  pi.registerCommand(".export", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
      const input = args || (await ctx.ui.input("Enter file path to export:"));
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
      const agentSession = getAgentSession();
      agentSession.agent.toolExecution = "sequential";
      ctx.ui.notify("Tool execution set to sequential");
    },
    description: "Set tool execution to sequential",
  });

  pi.registerCommand(".parallel", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
      agentSession.agent.toolExecution = "parallel";
      ctx.ui.notify("Tool execution set to parallel");
    },
    description: "Set tool execution to parallel",
  });

  pi.registerCommand(".get", {
    async handler(args, ctx) {
      if (!systemPromptOverride.effective()) {
        ctx.ui.notify(
          "Session has not started, system prompt can't be retrieved yet",
        );
        return;
      }
      ctx.ui.notify("Current system prompt: \n\n" + ctx.getSystemPrompt());
    },
    description: "Get system prompt",
  });

  pi.registerCommand(".state", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();

      ctx.ui.notify(
        "Current agent state: \n\n" +
          // @ts-ignore
          JSON.stringify(agentSession.agent._state, null, 2),
      );
    },
    description: "Get agent state",
  });

  pi.registerCommand(".set", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
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
        systemPromptOverride.set("");
        return;
      } else {
        systemPromptOverride.set(newPrompt);
        ctx.ui.notify("System prompt override updated to: \n\n" + newPrompt);
        if (agentSession.getActiveToolNames().length > 0) {
          ctx.ui.custom;
          ctx.ui.notify(
            "Note: System prompt override may not work as expected with active tools, consider using .no-tools command",
            "warning",
          );
        }
      }
    },
    description: "Set system prompt",
  });

  pi.registerCommand(".no-tools", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
      agentSession.setActiveToolsByName([]);
      ctx.ui.notify("All tools deactivated");
    },
    description: "Set tools to none",
  });

  pi.registerCommand(".ken", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
      systemPromptOverride.set("You are Ken, a helpful assistant.");
      agentSession.setActiveToolsByName([]);
      ctx.ui.notify(
        "System prompt set to 'You are Ken, a helpful assistant.' and all tools deactivated. You can now ask a question.",
      );
    },
  });

  pi.registerCommand(".tools", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
      const activeTools = agentSession.getActiveToolNames();
      if (activeTools.length === 0) {
        ctx.ui.notify("No active tools");
      } else {
        ctx.ui.notify("Active tools: " + activeTools.join(", "));
      }

      if (args.length > 0) {
        const newTools = args.split(/[, ]+/).map((t) => t.trim());
        agentSession.setActiveToolsByName(newTools);
        ctx.ui.notify("Active tools updated to: " + newTools.join(", "));
      }
    },
    description:
      "List active tools, or set active tools by providing tool names as argument",
  });

  pi.registerCommand(".eval", {
    async handler(args, ctx) {
      const agentSession = getAgentSession();
      const resultOfEval = eval(args);
      ctx.ui.notify("Eval result: \n" + JSON.stringify(resultOfEval, null, 2));
    },
    description: "Evaluate JavaScript",
  });
}
