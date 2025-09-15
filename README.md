# Polaroo Bot

A web automation bot that logs into Polaroo and navigates to the accounting dashboard. Features real-time monitoring with Cohere LLM integration.

## Features

- 🤖 Automated login to Polaroo
- 📊 Navigation to accounting dashboard
- 🔄 Real-time status monitoring
- 💬 WebSocket-based live updates
- 🎯 Cohere LLM integration
- 📱 Beautiful monitoring interface

## Setup

1. Copy `env.example` to `.env` and fill in your credentials:
   ```bash
   cp env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the bot:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000` to see the monitoring interface

## Environment Variables

- `COHERE_API_KEY`: Your Cohere API key
- `POLAROO_EMAIL`: Polaroo login email
- `POLAROO_PASSWORD`: Polaroo login password
- `SUPABASE_URL`: Supabase project URL (optional)
- `SUPABASE_ANON_KEY`: Supabase anonymous key (optional)

## Deployment on Render

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Set environment variables in Render dashboard
4. Deploy!

The bot will be available at your Render URL with real-time monitoring.

## Usage

1. Click "Start Bot" to begin automation
2. Watch real-time logs and status updates
3. Bot will automatically login and navigate to accounting dashboard
4. Monitor progress through the web interface
