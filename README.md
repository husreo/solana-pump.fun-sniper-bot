

# Pumpfun Sniper Bot

**Pumpfun Sniper Bot** is an automated trading bot for pump.fun. It listens for new token creation events, executes buy orders, and automatically sells tokens after a configurable delay. The bot is easy to set up and fully configurable via environment variables.
___
![alt text](https://i.imgur.com/rGbG3rT.png)

## Features

- **Automated Trading**: Buys and sells tokens based on real-time events.
- **Interactive CLI**: Easily configure the bot settings through a user-friendly CLI.
- **Comprehensive Logging**: Tracks all activities and errors in a log file.
- **Auto-Sell Mechanism**: Automatically sells tokens after a set delay.

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure the Bot**: Run the bot and select 'Edit config'

<br>

![alt text](https://i.imgur.com/pb6TAQ0.png)

<br>

3. **Run the Bot**:
   ```bash
   node index.js
   ```

## Configuration

The bot is configured through a `.env` file:

```plaintext
RPC_ENDPOINT=https://your.rpc.endpoint (Helius recommended)
WS_ENDPOINT=wss://your.ws.endpoint
LOG_FILE=bot.log
BUYING_ENABLED=true
INVESTMENT_AMOUNT=0.05
SLIPPAGE_TOLERANCE=20
WALLET_PUBLIC_KEY=your_wallet_public_key
WALLET_PRIVATE_KEY=your_wallet_private_key
AUTO_SELL_DELAY_MS=30000
```

### Key Settings

- **RPC_ENDPOINT**: RPC endpoint for Solana network.
- **WS_ENDPOINT**: WebSocket endpoint for real-time updates.
- **LOG_FILE**: Log file path.
- **BUYING_ENABLED**: Enable/disable buying.
- **AUTO_SELL_DELAY_MS**: Delay before selling tokens.

## Future Updates

I am going to add stop loss and take profit function to the sniper, so sniper will auto-sell the tokens when the price of the token meets the TP and SL.

## 🚀 Starting Budget

Personally I recommended to start with at least **1 SOL**. This amount provides a solid base to engage in multiple trades while managing risks effectively. Do *not* go in heavy. Slow and steady **wins** the race


