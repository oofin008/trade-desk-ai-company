# Discord Bridge

Lets you drive the AI startup from Discord (i.e., your phone). Messages in a designated channel get forwarded to a local Claude Code session; responses come back as messages.

## Setup

1. **Create a Discord bot:**
   - Go to https://discord.com/developers/applications → New Application
   - Bot → Reset Token → copy it
   - Bot → Privileged Gateway Intents → enable "Message Content Intent"
   - Grant permissions integer 2815748414626880
   - OAuth2 → URL Generator → scopes: `bot`, permissions: `Send Messages`, `Read Message History`, `Add Reactions`
   - Open the generated URL, invite the bot to your server

2. **Get your channel ID:**
   - Discord settings → Advanced → enable Developer Mode
   - Right-click the channel you want the bot in → Copy Channel ID
   - Right-click your own user → Copy User ID (for the allowlist)

3. **Install:**
   ```bash
   cd scripts/discord-bridge
   npm install
   ```

4. **Run:**
   ```bash
   DISCORD_TOKEN=your_bot_token \
   DISCORD_CHANNEL_ID=your_channel_id \
   ALLOWED_USER_IDS=your_user_id \
   AI_STARTUP_DIR=/absolute/path/to/ai-startup \
     npm start
   ```

5. **Test:** type a message in the channel. It should react with ⏳, then post the result.

## Important

- **Always set `ALLOWED_USER_IDS`.** Without it, anyone in the channel can drive your company.
- **One command at a time.** The bridge serializes — second message waits for the first to finish.
- **5-minute timeout per command.** Long-running agentic work gets killed. Tune in `bridge.js` if needed.
- **Costs apply.** Every Discord message = one Claude Code invocation = tokens spent.

## How `claude --print` works

The bridge uses Claude Code's headless mode:
```bash
claude --print --cwd /path/to/project "your prompt here"
```

This runs the prompt non-interactively against the project (which has all your CLAUDE.md, agents, etc. configured) and prints the result. Verify your Claude Code version supports this — flags may differ.

## Running persistently

For a real "company-in-Discord" setup, run this with a process manager:

```bash
# With pm2
npm install -g pm2
pm2 start bridge.js --name ai-startup-bridge
pm2 save
pm2 startup
```

Or systemd, or a tmux session, or a $5 VPS. Up to you.
