# Frontend

React + Next.js frontend for the order execution demo.

## Overview

This is a simple web UI that allows you to submit market orders and watch them execute in real-time via WebSocket. You can submit individual orders or fire 3 demo orders simultaneously to see concurrent processing.

## Prerequisites

- Node.js 18+
- Backend server running on `http://localhost:4000`

## Setup

Install dependencies:

```bash
cd frontend
npm install
```

## Running the App

```bash
npm run dev
```

The app will start on `http://localhost:3000`.

**Important:** Make sure the backend is running on port 4000 before using the frontend.

## Configuration

The frontend connects to the backend using environment variables. Default values are configured in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

Update these values if your backend runs on a different host/port.

## Features

### Single Order Submission

Fill out the form with:
- **Side**: Buy or Sell
- **Token In**: Source token (e.g., SOL)
- **Token Out**: Destination token (e.g., USDC)
- **Amount In**: Amount to swap
- **Max Slippage (bps)**: Maximum allowed slippage in basis points (100 = 1%)

Click **Submit Order** to execute.

### Demo Orders Button

Click **Submit 3 Demo Orders** to fire 3 orders simultaneously:
1. Buy 1 SOL → USDC (100 bps slippage)
2. Sell 100 USDC → SOL (50 bps slippage)
3. Buy 2.5 SOL → USDC (75 bps slippage)

This demonstrates concurrent order processing with the BullMQ worker.

### Real-time Status Updates

Each order displays:
- **Order ID**: UUID of the order
- **Status Badge**: Current status with color coding
- **Order Details**: Token pair, amount, chosen DEX, executed price
- **Transaction Hash**: When order is confirmed
- **Status History**: Last 5 status updates with timestamps

### Status Progression

Watch orders move through these states:
1. 🟡 **pending** - Order queued
2. 🔵 **routing** - Finding best DEX
3. 🟣 **building** - Building transaction
4. 🟠 **submitted** - Transaction submitted
5. 🟢 **confirmed** - Successfully executed
6. 🔴 **failed** - Order failed

## Recording a Demo

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:3000`
4. Click "Submit 3 Demo Orders"
5. Watch all 3 orders process concurrently
6. Note the DEX selection (Raydium/Meteora) and execution prices

## Build for Production

```bash
npm run build
npm start
```

The optimized app will run on `http://localhost:3000`.
