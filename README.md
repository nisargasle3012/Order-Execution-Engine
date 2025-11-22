🚀 Deployment Links
Frontend (Vercel)
https://order-execution-engine-lilac.vercel.app/

Backend (Railway)
https://order-execution-engine-production-821c.up.railway.app

# Order Execution Engine

A full-stack real-time order execution system with smart DEX routing, WebSocket status updates, and concurrent order processing.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)

## 🚀 Overview

This project demonstrates a production-grade order execution system that routes cryptocurrency orders to the best available DEX (Decentralized Exchange). It features:

- **Smart Routing**: Automatically compares quotes from Raydium and Meteora DEXes
- **Real-time Updates**: WebSocket streaming of order status changes
- **Concurrent Processing**: Handles 10 orders simultaneously using BullMQ
- **Event Logging**: Complete audit trail in MongoDB
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Production Ready**: Docker Compose, health checks, graceful shutdown

## 📁 Project Structure

```
.
├── backend/              # Express + TypeScript API
│   ├── src/
│   │   ├── config/      # Environment configuration
│   │   ├── domain/      # Order domain model
│   │   ├── dex/         # Mock DEX router (Raydium/Meteora)
│   │   ├── infra/       # PostgreSQL, MongoDB, Redis clients
│   │   ├── queue/       # BullMQ order queue
│   │   ├── workers/     # Order processing worker
│   │   ├── ws/          # WebSocket event hub
│   │   ├── routes/      # HTTP API routes
│   │   └── index.ts     # Server entry point
│   ├── test/            # Jest unit & integration tests
│   └── postman/         # Postman API collection
│
├── frontend/            # Next.js + React UI
│   └── app/
│       ├── page.tsx     # Order submission interface
│       └── globals.css  # Styling
│
└── STARTUP_GUIDE.md     # Detailed setup instructions
```

## ✨ Features

### Backend

- **RESTful API** with Express and TypeScript
- **Smart DEX Routing** - Compares Raydium (0.3% fee) vs Meteora (0.2% fee)
- **BullMQ Worker** - 10 concurrent orders, exponential backoff, 3 retries
- **WebSocket Server** - Real-time status updates for order lifecycle
- **Data Persistence**:
  - PostgreSQL for order state (ACID transactions)
  - MongoDB for event audit logs
  - Redis for job queue
- **Validation** - Zod schemas for type-safe request handling
- **Testing** - Jest unit tests and integration tests with supertest
- **API Documentation** - Postman collection included

### Frontend

- **Next.js 14** with App Router and TypeScript
- **Real-time Order Tracking** - WebSocket connections per order
- **Concurrent Demo** - Submit 3 orders simultaneously
- **Status Visualization** - Color-coded badges and progress tracking
- **Clean UI** - No external CSS frameworks, pure CSS

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Language**: TypeScript 5.x
- **Databases**: PostgreSQL 15, MongoDB 6
- **Cache/Queue**: Redis 7, BullMQ 4.x
- **WebSockets**: ws 8.x
- **Validation**: Zod 3.x
- **Testing**: Jest 29, Supertest

### Frontend
- **Framework**: Next.js 14
- **Library**: React 18
- **Language**: TypeScript 5.x
- **Styling**: Pure CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (or PostgreSQL, MongoDB, Redis installed locally)

### 1. Clone Repository

```bash
git clone https://github.com/nisargasle3012/order-execution-engine.git
cd order-execution-engine
```

### 2. Start Infrastructure

#### Option A: Docker (Recommended)

```bash
cd backend
docker-compose up -d
```

#### Option B: Local Services

```bash
brew install postgresql@15 mongodb-community redis
brew services start postgresql@15
brew services start mongodb-community
brew services start redis
createdb orderdb
```

### 3. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000`

### 4. Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📖 Usage

### Single Order Submission

1. Open `http://localhost:3000`
2. Fill the order form:
   - **Side**: Buy or Sell
   - **Token In**: SOL
   - **Token Out**: USDC
   - **Amount**: 1
   - **Max Slippage**: 100 bps
3. Click **Submit Order**
4. Watch real-time status updates!

### Demo: Multiple Concurrent Orders

Click **"Submit 3 Demo Orders"** to see:
- 3 orders submitted simultaneously
- Concurrent processing (all complete ~same time)
- Different DEX selections
- Real-time WebSocket updates

### Order Status Flow

```
🟡 pending    → Order queued (instant)
🔵 routing    → Finding best DEX (~200ms)
🟣 building   → Building transaction (~300ms)
🟠 submitted  → Transaction submitted (~2-3s)
🟢 confirmed  → Successfully executed ✓
🔴 failed     → Order failed (with error details)
```

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm test
```

**Test Coverage:**
- ✅ Mock DEX router calculations
- ✅ Routing decision logic
- ✅ Full order lifecycle with WebSocket
- ✅ Concurrent order processing (5 orders)
- ✅ Status progression validation

### Test with Postman

1. Import `backend/postman/order-execution.collection.json`
2. Update `baseUrl` variable (default: `http://localhost:4000`)
3. Execute requests and test WebSocket connections

### API Health Check

```bash
curl http://localhost:4000/health
# Returns: {"status":"ok"}
```

## 📡 API Endpoints

### POST `/api/orders/execute`

Execute a market order with automatic DEX routing.

**Request:**
```json
{
  "side": "buy",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1,
  "maxSlippageBps": 100
}
```

**Response:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### WebSocket: `/api/orders/execute?orderId=<id>`

Connect to receive real-time order status updates.

**URL:** `ws://localhost:4000/api/orders/execute?orderId=<orderId>`

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

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTP POST /api/orders/execute
       │ WebSocket /api/orders/execute?orderId=...
       ▼
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌──────────────────────────────┐  │
│  │   Routes + Validation (Zod)  │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   PostgreSQL (Order State)   │  │
│  └──────────────────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   BullMQ Queue (Redis)       │  │
│  └──────────┬───────────────────┘  │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       BullMQ Worker (x10)           │
│  ┌──────────────────────────────┐  │
│  │  1. Fetch order from DB      │  │
│  │  2. Get quotes (Raydium +    │  │
│  │     Meteora) in parallel     │  │
│  │  3. Select best DEX          │  │
│  │  4. Execute swap (mock)      │  │
│  │  5. Update DB with result    │  │
│  └──────────┬───────────────────┘  │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Event System                   │
│  ┌──────────────────────────────┐  │
│  │  EventEmitter broadcasts     │  │
│  │  status changes              │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ├──→ WebSocket Clients │
│             │                       │
│             └──→ MongoDB Event Log  │
└─────────────────────────────────────┘
```
