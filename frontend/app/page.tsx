'use client'

import { useState, useEffect, useRef } from 'react'

interface OrderStatus {
  orderId: string
  status: string
  data?: {
    tokenIn?: string
    tokenOut?: string
    amountIn?: number
    chosenDex?: string
    executedPrice?: number
    txHash?: string
    failureReason?: string
    price?: number
    fee?: number
  }
  updates: Array<{ status: string; timestamp: Date; data?: any }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

export default function Home() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [tokenIn, setTokenIn] = useState('SOL')
  const [tokenOut, setTokenOut] = useState('USDC')
  const [amountIn, setAmountIn] = useState('1')
  const [maxSlippageBps, setMaxSlippageBps] = useState('100')
  const [orders, setOrders] = useState<OrderStatus[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsConnections = useRef<Map<string, WebSocket>>(new Map())

  const connectWebSocket = (orderId: string, orderData?: any) => {
    const ws = new WebSocket(`${WS_URL}/api/orders/execute?orderId=${orderId}`)

    ws.onopen = () => {
      console.log(`WebSocket connected for order ${orderId}`)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Received message:', message)

      setOrders((prevOrders) => {
        const existingOrder = prevOrders.find((o) => o.orderId === orderId)

        if (existingOrder) {
          return prevOrders.map((o) =>
            o.orderId === orderId
              ? {
                  ...o,
                  status: message.status,
                  data: { ...o.data, ...message.data },
                  updates: [
                    ...o.updates,
                    {
                      status: message.status,
                      timestamp: new Date(),
                      data: message.data,
                    },
                  ],
                }
              : o
          )
        } else {
          return [
            ...prevOrders,
            {
              orderId,
              status: message.status,
              data: { ...orderData, ...message.data },
              updates: [
                {
                  status: message.status,
                  timestamp: new Date(),
                  data: message.data,
                },
              ],
            },
          ]
        }
      })

      // Close connection on terminal status
      if (message.status === 'confirmed' || message.status === 'failed') {
        setTimeout(() => {
          ws.close()
          wsConnections.current.delete(orderId)
        }, 1000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log(`WebSocket closed for order ${orderId}`)
      wsConnections.current.delete(orderId)
    }

    wsConnections.current.set(orderId, ws)
  }

  const submitOrder = async (orderData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit order')
      }

      const { orderId } = await response.json()
      console.log('Order submitted:', orderId)

      // Add order to list immediately
      setOrders((prev) => [
        {
          orderId,
          status: 'pending',
          data: orderData,
          updates: [],
        },
        ...prev,
      ])

      // Connect WebSocket
      connectWebSocket(orderId, orderData)

      return orderId
    } catch (err) {
      console.error('Error submitting order:', err)
      throw err
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await submitOrder({
        side,
        tokenIn,
        tokenOut,
        amountIn: parseFloat(amountIn),
        maxSlippageBps: parseInt(maxSlippageBps),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDemoOrders = async () => {
    setError(null)
    setIsSubmitting(true)

    const demoOrders = [
      { side: 'buy', tokenIn: 'SOL', tokenOut: 'USDC', amountIn: 1, maxSlippageBps: 100 },
      { side: 'sell', tokenIn: 'USDC', tokenOut: 'SOL', amountIn: 100, maxSlippageBps: 50 },
      { side: 'buy', tokenIn: 'SOL', tokenOut: 'USDC', amountIn: 2.5, maxSlippageBps: 75 },
    ]

    try {
      await Promise.all(demoOrders.map((order) => submitOrder(order)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit demo orders')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    return () => {
      wsConnections.current.forEach((ws) => ws.close())
      wsConnections.current.clear()
    }
  }, [])

  return (
    <div className="container">
      <h1>Order Execution Demo</h1>

      <div className="form-container">
        <h2>Submit Order</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="side">Side</label>
            <select
              id="side"
              value={side}
              onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
              disabled={isSubmitting}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tokenIn">Token In</label>
            <input
              id="tokenIn"
              type="text"
              value={tokenIn}
              onChange={(e) => setTokenIn(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenOut">Token Out</label>
            <input
              id="tokenOut"
              type="text"
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amountIn">Amount In</label>
            <input
              id="amountIn"
              type="number"
              step="0.01"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxSlippageBps">Max Slippage (bps)</label>
            <input
              id="maxSlippageBps"
              type="number"
              value={maxSlippageBps}
              onChange={(e) => setMaxSlippageBps(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="button-group">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Order'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDemoOrders}
              disabled={isSubmitting}
            >
              Submit 3 Demo Orders
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2>Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p style={{ color: '#666' }}>No orders yet. Submit an order to get started.</p>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={order.orderId} className={`order-card ${order.status}`}>
                <div className="order-id">ID: {order.orderId.substring(0, 8)}...</div>
                <div className={`order-status status-${order.status}`}>
                  {order.status.toUpperCase()}
                </div>

                {order.data && (
                  <div className="order-details">
                    <div className="detail-row">
                      <span className="detail-label">Side:</span>
                      <span className="detail-value">{order.data.tokenIn || 'N/A'} → {order.data.tokenOut || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value">{order.data.amountIn || 'N/A'}</span>
                    </div>
                    {order.data.chosenDex && (
                      <div className="detail-row">
                        <span className="detail-label">DEX:</span>
                        <span className="detail-value">{order.data.chosenDex}</span>
                      </div>
                    )}
                    {order.data.executedPrice && (
                      <div className="detail-row">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value">{order.data.executedPrice.toFixed(4)}</span>
                      </div>
                    )}
                    {order.data.txHash && (
                      <div className="detail-row">
                        <span className="detail-label">TX Hash:</span>
                        <span className="detail-value tx-hash" title={order.data.txHash}>
                          {order.data.txHash.substring(0, 10)}...
                        </span>
                      </div>
                    )}
                    {order.data.failureReason && (
                      <div className="detail-row">
                        <span className="detail-label">Error:</span>
                        <span className="detail-value" style={{ color: '#C62828' }}>
                          {order.data.failureReason}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {order.updates.length > 0 && (
                  <div className="status-updates">
                    <strong>Status History:</strong>
                    {order.updates.slice(-5).map((update, idx) => (
                      <div key={idx} className="status-update">
                        {update.status} • {update.timestamp.toLocaleTimeString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
