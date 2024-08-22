

# Free Pump Sniper Bot

**Pump Sniper Bot** is an automated trading bot for pump.fun. It listens for new token creation events, executes buy orders, and automatically sells tokens after a configurable delay. The bot is easy to set up and fully configurable via environment variables.
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


![alt text](https://i.imgur.com/pb6TAQ0.png)
2. **Configure the Bot**: Run the bot and select 'Edit config'

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

⭐ **5 stars**: Rug detection  
⭐ **10 stars**: Developer sell monitoring  
⭐ **15 stars**: Percentage-based selling  
⭐ **20 stars**: Live dashboard for PnL tracking

## My trades!
![alt text](https://i.imgur.com/3r2wzVE.png)

