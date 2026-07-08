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

const roster = require('./roster.json');

module.exports = {
  apps: roster.map((entry) => ({
    name: `agent-${entry.name}`,
    script: 'agent-runner.js',
    cwd: __dirname,
    env: { AGENT_NAME: entry.name },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000
  }))
};
