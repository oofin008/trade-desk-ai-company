// pm2 process definitions — one persistent process per agent.
//
//   cd scripts/discord-agents && npm install
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup     # survive reboot
//   pm2 logs                    # tail all agents
//   pm2 restart all             # after editing roster/runner
//
// Per-agent bot tokens, DISCORD_CHANNEL_ID, ALLOWED_USER_IDS, etc. are read
// from the repo-root .env by the runner (see lib/chunk.js loadEnvFile).

const path = require('node:path');
const roster = require('./roster.json');

// pm2 process names are namespaced by this company's own directory name, so
// running more than one AI company on the same machine doesn't collide (two
// companies would otherwise both want `agent-ceo`). Rename the directory and
// the processes rename with it — `pm2 delete all` first if you do.
const ns = path.basename(path.resolve(__dirname, '..', '..'));

module.exports = {
  apps: roster.map((entry, i) => ({
    name: `${ns}-agent-${entry.name}`,
    script: 'agent-runner.js',
    cwd: __dirname,
    // Pin the absolute path to the claude CLI. pm2's PATH differs from the
    // login shell and was resolving a broken npm stub (spawn EACCES); the
    // native install lives at ~/.local/bin and isn't on pm2's PATH.
    env: {
      AGENT_NAME: entry.name,
      CLAUDE_CMD: process.env.CLAUDE_CMD || `${process.env.HOME}/.local/bin/claude`,
      // Stream each turn's thinking + tool calls so delegation is auditable:
      // you'll see `🔧 Task(...)` when a head dispatches to a specialist, and
      // catch a head that edits source directly instead. Override with
      // LOG_AGENT_STEPS=0 in the environment to quiet the logs once validated.
      LOG_AGENT_STEPS: process.env.LOG_AGENT_STEPS || '1'
    },
    autorestart: true,
    // A sleep/wake storm can crash-loop briefly; a low cap would make pm2 give
    // up and leave the agent permanently down until a manual restart.
    min_uptime: '30s',                 // a run past 30s counts as stable
    max_restarts: 50,
    exp_backoff_restart_delay: 3000,   // back off on repeated fast crashes
    // Stagger initial logins so 5 bots don't all IDENTIFY at the same instant
    // (after a wake, simultaneous reconnects are what get sessions invalidated).
    restart_delay: 3000 + i * 1500
  }))
};
