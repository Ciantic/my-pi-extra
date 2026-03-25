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

export function getAgentSession() {
  if (!agentSession) {
    throw new Error(
      "AgentSession is not initialized yet, use this in PI extension hooks or commands at the earliest",
    );
  }
  return agentSession;
}
