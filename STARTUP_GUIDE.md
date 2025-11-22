# Order Execution Engine - Startup Guide

## Quick Start

This project consists of a backend API (Node.js/Express/TypeScript) and a frontend UI (Next.js/React) for demonstrating real-time order execution with DEX routing.

## Prerequisites Installed ✓

- ✅ Node.js dependencies installed for both backend and frontend
- ⚠️ Docker services (PostgreSQL, MongoDB, Redis) need to be started

## Starting the Application

### Step 1: Start Infrastructure Services

You have two options:

#### Option A: Using Docker (Recommended)

1. **Start Docker Desktop** on your Mac

2. **Start the services:**
   ```bash
   cd backend
   docker-compose up -d
   ```

3. **Verify services are running:**
   ```bash
   docker-compose ps
   ```

   You should see:
   - `orderdb-postgres` on port 5432
   - `orderdb-mongo` on port 27017
   - `orderdb-redis` on port 6379

#### Option B: Install Services Locally

```bash
# Install with Homebrew
brew install postgresql@15 mongodb-community redis

# Start services
brew services start postgresql@15
brew services start mongodb-community
brew services start redis

# Create database
createdb orderdb
```

### Step 2: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
```
Initializing PostgreSQL...
PostgreSQL connected
PostgreSQL tables initialized
Initializing MongoDB...
MongoDB connected
Starting order worker...
Order worker started
Server running on port 4000 in development mode
```

**Backend will be available at:** `http://localhost:4000`

**Test the health endpoint:**
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

### Step 3: Start Frontend UI

Open a **new terminal window:**

```bash
cd frontend
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- info Using webpack 5
```

**Frontend will be available at:** `http://localhost:3000`

## Using the Application

### Single Order Submission

1. Open `http://localhost:3000` in your browser
2. Fill out the order form:
   - **Side**: Buy or Sell
   - **Token In**: SOL
   - **Token Out**: USDC
   - **Amount In**: 1
   - **Max Slippage**: 100 (basis points)
3. Click **Submit Order**
4. Watch real-time status updates!

### Demo: Multiple Concurrent Orders

1. Click **Submit 3 Demo Orders** button
2. Watch 3 orders process simultaneously
3. Observe:
   - Different DEX selections (Raydium vs Meteora)
   - Execution prices varying slightly
   - All orders completing around the same time (concurrent processing)

### Order Status Flow

You'll see orders progress through these states:

1. 🟡 **pending** - Order queued (instant)
2. 🔵 **routing** - Comparing Raydium vs Meteora quotes (~200ms)
3. 🟣 **building** - Building transaction (~300ms)
4. 🟠 **submitted** - Transaction submitted (~2-3s)
5. 🟢 **confirmed** - Successfully executed ✓

Total time per order: ~3-4 seconds

## Testing the API with Postman

1. Import the collection: `backend/postman/order-execution.collection.json`
2. Submit an order via Postman
3. Copy the `orderId` from the response
4. Use a WebSocket client to connect to:
   ```
   ws://localhost:4000/api/orders/execute?orderId=<your-order-id>
   ```

## Running Tests

### Backend Tests

```bash
cd backend
npm test
```

**Tests include:**
- ✅ Mock DEX router unit tests
- ✅ Routing decision logic
- ✅ Full order flow integration tests
- ✅ Concurrent order processing (5 orders)
- ✅ WebSocket status streaming

## Project Structure

```
.
├── backend/                  # Express + TypeScript API
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── domain/          # Order domain model
│   │   ├── dex/             # Mock DEX router (Raydium/Meteora)
│   │   ├── infra/           # PostgreSQL, MongoDB, Redis
│   │   ├── queue/           # BullMQ order queue
│   │   ├── workers/         # Order processing worker
│   │   ├── ws/              # WebSocket event hub
│   │   ├── routes/          # HTTP API routes
│   │   ├── server.ts        # Express app setup
│   │   └── index.ts         # Server entry point
│   ├── test/                # Jest tests
│   ├── postman/             # API collection
│   └── docker-compose.yml   # Infrastructure services
│
└── frontend/                # Next.js + React UI
    ├── app/
    │   ├── page.tsx         # Main order submission page
    │   ├── layout.tsx       # App layout
    │   └── globals.css      # Styling
    └── .env.local           # Frontend configuration
```

## Architecture Highlights

### Backend
- **Concurrency**: 10 orders processed simultaneously via BullMQ
- **Retry Logic**: 3 attempts with exponential backoff
- **Smart Routing**: Compares Raydium (0.3% fee) vs Meteora (0.2% fee)
- **Event-Driven**: WebSocket broadcasts + MongoDB event logs
- **Data Stores**:
  - PostgreSQL for order state
  - MongoDB for audit logs
  - Redis for job queue

### Frontend
- **Real-time Updates**: WebSocket connections per order
- **Concurrent Tracking**: Multiple orders displayed simultaneously
- **Status History**: Last 5 status updates per order
- **Clean UI**: No external CSS frameworks, pure CSS

## Troubleshooting

### Backend won't start

**Error:** `Cannot connect to PostgreSQL/MongoDB/Redis`

**Solution:** Make sure Docker services are running:
```bash
cd backend
docker-compose up -d
docker-compose ps  # Verify all services are healthy
```

### Frontend can't connect to backend

**Error:** `Failed to fetch` or WebSocket connection errors

**Solution:**
1. Ensure backend is running on port 4000
2. Check `frontend/.env.local` has correct URLs:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_WS_URL=ws://localhost:4000
   ```

### Orders stuck in "pending"

**Solution:** Check that the BullMQ worker started:
- Look for "Order worker started" in backend logs
- Verify Redis is running: `redis-cli ping` (should return PONG)

## Stopping the Application

1. **Stop frontend**: `Ctrl+C` in frontend terminal
2. **Stop backend**: `Ctrl+C` in backend terminal
3. **Stop Docker services**:
   ```bash
   cd backend
   docker-compose down
   ```

## Demo Recording Tips

For the best demo video:

1. Start with backend terminal visible (show logs)
2. Open frontend at `http://localhost:3000`
3. Click "Submit 3 Demo Orders"
4. Show the order cards updating in real-time
5. Highlight:
   - Different DEX selections (Raydium/Meteora)
   - Concurrent processing (all complete ~same time)
   - Status progression with timestamps
   - Executed prices and transaction hashes

## Support

- Backend API docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
- Postman collection: `backend/postman/order-execution.collection.json`
