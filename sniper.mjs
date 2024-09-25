import inquirer from 'inquirer';
import { VersionedTransaction, Connection, Keypair } from '@solana/web3.js';
import WebSocket from 'ws';
import bs58 from 'bs58';
import { logColor } from 'quickcolor';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();


// ASCII art
const asciiArt = `
 ____  ____  ____  ____  ____  __  __  __  __  ____ 
( ___)(  _ \\( ___)( ___)(  _ \\(  )(  )(  \\/  )(  _ \\
 )__)  )   / )__)  )__)  )___/ )(__)(  )    (  )___/
(__)  (_)_\\)(____)(____)(__)  (______)(_/\\/\\_)(__)  

Free pump.fun sniper! - By @coinzap
`;

const web3Connection = new Connection(process.env.RPC_ENDPOINT, 'confirmed');
let ws;

const logStream = fs.createWriteStream(process.env.LOG_FILE, { flags: 'a' });
let walletHoldings = {};
let buyingEnabled = process.env.BUYING_ENABLED === 'true';
const lowBalanceThreshold = 0.02 * 1e9;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

const buys = [];
const sells = [];
const checks = [];
const errors = [];

function log(message, color = 'white', type = 'info') {
  const timestamp = new Date().toISOString();
  const label = `[${type.toUpperCase()}]`;
  logColor(`[${timestamp}] ${label} ${message}`, color);
  logStream.write(`[${timestamp}] ${label} ${message}\n`);

  switch (type) {
    case 'buy':
      buys.push({ timestamp, message });
      break;
    case 'sell':
      sells.push({ timestamp, message });
      break;
    case 'check':
      checks.push({ timestamp, message });
      break;
    case 'error':
      errors.push({ timestamp, message });
      break;
    default:
      break;
  }
}

function connectWebSocket() {
  ws = new WebSocket(process.env.WS_ENDPOINT);

  ws.on('open', () => {
    log('Connection opened.', 'bright');
    subscribeToNewTokens();
    reconnectAttempts = 0;
  });

  ws.on('message', async (data) => {
    const newTokenInfo = JSON.parse(data);
    if (newTokenInfo.message === 'Successfully subscribed to token creation events.') {
      log(`Subscription message: ${newTokenInfo.message}`, 'blue');
    } else {
      log(`Received new token!: ${JSON.stringify(newTokenInfo)}`, 'blue');
      await handleNewToken(newTokenInfo);
    }
  });

  ws.on('error', (error) => {
    log(`WebSocket error: ${error.message}`, 'red', 'error');
    handleWebSocketError();
  });

  ws.on('close', () => {
    log('WebSocket connection closed. Reconnecting...', 'yellow', 'error');
    handleWebSocketError();
  });
}

function subscribeToNewTokens() {
  const payload = { method: 'subscribeNewToken' };
  ws.send(JSON.stringify(payload));
}

function handleWebSocketError() {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    setTimeout(connectWebSocket, 1000 * reconnectAttempts);
  } else {
    log('Max reconnection attempts reached. Giving up.', 'red', 'error');
  }
}

async function executeBuyOrder(tokenMint) {
  if (!buyingEnabled) {
    log('Buying is disabled. Skipping buy order.', 'yellow', 'check');
    return;
  }

  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    const balance = await web3Connection.getBalance(keypair.publicKey);

    if (balance < lowBalanceThreshold) {
      log(`Low balance detected: ${balance} only available, Quitting.`, 'red', 'error');
      return;
    }

    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: process.env.WALLET_PUBLIC_KEY,
        action: 'buy',
        mint: tokenMint,
        denominatedInSol: 'true',
        amount: process.env.INVESTMENT_AMOUNT,
        slippage: process.env.SLIPPAGE_TOLERANCE,
        priorityFee: 0.005, // Worked the best for me
        pool: 'pump',
      }),
    });

    if (response.status === 200) {
      const data = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      tx.sign([keypair]);
      const signature = await web3Connection.sendTransaction(tx);
      log(`Transaction successful: https://solscan.io/tx/${signature}`, 'green', 'buy');
      trackTokenHoldings(tokenMint);

      const autoSellDelay = parseInt(process.env.AUTO_SELL_DELAY_MS, 10) || 30000; // Default to 30 seconds, if nothing is set!

      setTimeout(async () => {
        log(`${autoSellDelay / 1000} seconds passed since purchase. Executing sell order for ${tokenMint}.`, 'yellow', 'sell');
        await executeSellOrder(tokenMint, process.env.INVESTMENT_AMOUNT);
      }, autoSellDelay);

    } else {
      log(`Trade request failed: ${response.statusText}`, 'red', 'error');
      subscribeToNewTokens();
    }
  } catch (error) {
    log(`Error executing buy order: ${error.message}`, 'red', 'error');
    subscribeToNewTokens();
  }
}

async function executeSellOrder(tokenMint, amount) {
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: process.env.WALLET_PUBLIC_KEY,
        action: 'sell',
        mint: tokenMint,
        denominatedInSol: 'true',
        amount: amount,
        slippage: process.env.SLIPPAGE_TOLERANCE,
        priorityFee: 0.001, // Important the sell goes through
        pool: "pump",
      }),
    });

    if (response.status === 200) {
      const data = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      tx.sign([keypair]);
      const signature = await web3Connection.sendTransaction(tx);
      log(`Sell transaction successful: https://solscan.io/tx/${signature}`, 'green', 'sell');
    } else {
      log(`Trade request failed: ${response.statusText}`, 'red', 'error');
    }
  } catch (error) {
    log(`Error executing sell order: ${error.message}`, 'red', 'error');
  }
}

function trackTokenHoldings(tokenMint) {
  if (!walletHoldings[tokenMint]) {
    walletHoldings[tokenMint] = {
      amount: process.env.INVESTMENT_AMOUNT,
      initialPrice: process.env.INVESTMENT_AMOUNT,
      highestPrice: process.env.INVESTMENT_AMOUNT,
    };
  }
}

async function handleNewToken(newTokenInfo) {
  const tokenMint = newTokenInfo.mint;
  if (tokenMint) {
    log(`Newly minted token detected: ${tokenMint}`, 'cyan', 'check');
    await executeBuyOrder(tokenMint);
  } else {
    log(`Invalid or duplicate token data received: ${JSON.stringify(newTokenInfo)}`, 'red', 'error');
  }
}

process.on('unhandledRejection', (error) => {
  log(`Unhandled promise rejection: ${error.message}`, 'red', 'error');
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'red', 'error');
});

const readConfig = () => {
  return {
    rpc_endpoint: process.env.RPC_ENDPOINT,
    ws_endpoint: process.env.WS_ENDPOINT,
    log_file: process.env.LOG_FILE,
    buying_enabled: process.env.BUYING_ENABLED,
    investment_amount: process.env.INVESTMENT_AMOUNT,
    slippage_tolerance: process.env.SLIPPAGE_TOLERANCE,
    wallet_credentials: {
      public_key: process.env.WALLET_PUBLIC_KEY,
      private_key: process.env.WALLET_PRIVATE_KEY,
    },
    retry_attempts: process.env.RETRY_ATTEMPTS,
    retry_delay: process.env.RETRY_DELAY,
    auto_sell_delay_ms: process.env.AUTO_SELL_DELAY_MS,
  };
};

const writeConfig = (newConfig) => {
  fs.writeFileSync('.env', Object.entries(newConfig).map(([key, value]) => `${key}=${value}`).join('\n'), 'utf-8');
};

const editConfig = async () => {
  const config = readConfig();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'RPC_ENDPOINT',
      message: 'Enter RPC endpoint:',
      default: config.rpc_endpoint,
    },
    {
      type: 'input',
      name: 'WS_ENDPOINT',
      message: 'Enter WebSocket endpoint:',
      default: config.ws_endpoint,
    },
    {
      type: 'input',
      name: 'LOG_FILE',
      message: 'Enter log file path:',
      default: config.log_file,
    },
    {
      type: 'confirm',
      name: 'BUYING_ENABLED',
      message: 'Enable buying?',
      default: config.buying_enabled,
    },
    {
      type: 'input',
      name: 'INVESTMENT_AMOUNT',
      message: 'Enter investment amount:',
      default: config.investment_amount,
    },
    {
      type: 'input',
      name: 'SLIPPAGE_TOLERANCE',
      message: 'Enter slippage tolerance:',
      default: config.slippage_tolerance,
    },
    {
      type: 'input',
      name: 'WALLET_PUBLIC_KEY',
      message: 'Enter wallet public key:',
      default: config.wallet_credentials.public_key,
    },
    {
      type: 'input',
      name: 'WALLET_PRIVATE_KEY',
      message: 'Enter wallet private key:',
      default: config.wallet_credentials.private_key,
    },
    {
      type: 'input',
      name: 'RETRY_ATTEMPTS',
      message: 'Enter number of retry attempts:',
      default: config.retry_attempts,
    },
    {
      type: 'input',
      name: 'RETRY_DELAY',
      message: 'Enter retry delay in milliseconds:',
      default: config.retry_delay,
    },
    {
      type: 'input',
      name: 'AUTO_SELL_DELAY_MS',
      message: 'Enter auto-sell delay in milliseconds:',
      default: config.auto_sell_delay_ms || 30000,
    },
  ]);

  writeConfig(answers);
  
  console.log('Configuration updated successfully.');
  mainMenu();
};

const initializeBot = () => {
  log('Bot started.', 'green');
  connectWebSocket();
};

const mainMenu = async () => {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'menuOption',
      message: 'Select an option:',
      choices: [
        'Start',
        'Edit Config',
        'Exit'
      ],
    },
  ]);

  switch (answer.menuOption) {
    case 'Start':
      initializeBot();
      break;
    case 'Edit Config':
      await editConfig();
      break;
    case 'Exit':
      console.log('Exiting...');
      process.exit(0);
  }
};

console.clear();
logColor(asciiArt, 'blue');
mainMenu();
