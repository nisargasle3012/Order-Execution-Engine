# Backend

## Overview

This is an Express + TypeScript backend for an order execution engine that simulates DEX trading. Orders are routed to the best available venue by comparing mock quotes from Raydium and Meteora. Real-time order lifecycle updates are streamed via WebSockets, allowing clients to track progress from submission through confirmation. The system uses BullMQ with Redis for asynchronous job processing with retry logic, PostgreSQL for persistent order storage, and MongoDB for event audit logs.

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - HTTP server and REST API
- **TypeScript** - Type-safe development
- **PostgreSQL** - Order storage and status tracking
- **MongoDB** - Event logs and audit trail
- **Redis** - Queue backend for BullMQ
- **BullMQ** - Job queue with concurrency and retry support
- **WebSockets (ws)** - Real-time status updates
- **Jest** - Unit and integration testing
- **Zod** - Request validation

## Order Type Choice

This implementation supports **market orders only**. Market orders execute immediately at the best available price by comparing live quotes from Raydium and Meteora DEXes.

**Future Extensions:**
- **Limit Orders**: Could be added by storing a target price in the database and running a background checker that polls DEX quotes periodically. When the market price crosses the limit threshold, the order would be routed through the existing execution pipeline.
- **Sniper Orders**: Could subscribe to token launch or migration events (e.g., via WebSocket to a blockchain indexer), then automatically trigger order creation and route through the same worker queue for execution.

## Architecture

The backend follows an event-driven architecture with clear separation of concerns:

1. **HTTP API** - Express server handles `POST /api/orders/execute`, validates requests with Zod, creates orders in PostgreSQL, and adds jobs to BullMQ queue. Returns `202 Accepted` with `orderId`.

2. **WebSocket Streaming** - Clients connect to `ws://host/api/orders/execute?orderId=<id>` to receive real-time status updates. The server uses Node's EventEmitter to broadcast status changes to connected clients.

3. **BullMQ Worker** - Processes orders with **concurrency: 10** and **exponential backoff** (3 retries). Each job:
   - Fetches quotes from MockDexRouter (Raydium and Meteora)
   - Selects the best venue based on price
   - Simulates transaction building and submission
   - Updates PostgreSQL with status and execution details
   - Emits events to WebSocket clients and logs to MongoDB

4. **MockDexRouter** - Simulates DEX behavior with configurable pricing variance. Compares Raydium (0.3% fee) and Meteora (0.2% fee) quotes in parallel and returns the best execution price.

5. **Data Stores**:
   - **PostgreSQL** - Primary order storage with full ACID properties
   - **MongoDB** - Append-only event log for audit trail
   - **Redis** - BullMQ job queue and state management

## Features

- **Market Order Execution**: Execute buy/sell orders with automatic DEX routing
- **Real-time Updates**: WebSocket support for live order status tracking
- **Concurrent Processing**: Process up to 10 orders simultaneously
- **Smart Routing**: Automatic DEX selection between Raydium and Meteora
- **Event Logging**: MongoDB-based event log for audit trails
- **Retry Logic**: Automatic retry with exponential backoff on failures

## Running Locally

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for databases)

### 1. Start Infrastructure

Use Docker Compose to start PostgreSQL, MongoDB, and Redis:

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: orderdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

```bash
docker-compose up -d
```

### 2. Configure Environment

Create a `.env` file in the backend directory:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orderdb
MONGO_URL=mongodb://localhost:27017/orderdb
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### 3. Install and Run

```bash
cd backend
npm install
npm run dev
```

The server will start on `http://localhost:4000`.

### Commands

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test
```

## API Summary

### POST /api/orders/execute

Execute a market order with automatic DEX routing.

**Request:**
```json
POST /api/orders/execute
Content-Type: application/json

{
  "side": "buy" | "sell",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1,
  "maxSlippageBps": 100
}
```

**Validation:**
- `side`: Must be "buy" or "sell"
- `tokenIn`, `tokenOut`: Non-empty strings
- `amountIn`: Positive number
- `maxSlippageBps`: Integer between 0-10000 (basis points)

**Response:**
```json
202 Accepted

{
  "orderId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
200 OK

{
  "status": "ok"
}
```

### WebSocket: /api/orders/execute?orderId=<id>

Connect to receive real-time order status updates.

**URL:** `ws://localhost:4000/api/orders/execute?orderId=<orderId>`

**Status Progression:**

1. **pending** - Order created and queued for processing
2. **routing** - Comparing Raydium and Meteora quotes to find best price
3. **building** - Building transaction with selected DEX
4. **submitted** - Transaction submitted to blockchain (mock)
5. **confirmed** - Order executed successfully ✓
6. **failed** - Order failed with error details ✗

**Message Format:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "data": {
    "txHash": "0xabc123...",
    "executedPrice": 1.002,
    "chosenDex": "raydium"
  }
}
```

## Testing

Run the test suite with Jest:

```bash
npm test
```

**Unit Tests:**
- Mock DEX router price calculations
- Routing decisions with deterministic randomness
- Quote comparison logic

**Integration Tests:**
- Full order lifecycle with WebSocket streaming
- Parallel order processing (5 concurrent orders)
- Status progression verification
- Concurrency and retry behavior

## Postman Collection

Import the Postman collection for easy API testing:

**Location:** `postman/order-execution.collection.json`

1. Open Postman
2. Click "Import"
3. Select the collection file
4. Update `baseUrl` variable if needed (default: `http://localhost:4000`)

Includes health check, order execution examples, and WebSocket documentation.
