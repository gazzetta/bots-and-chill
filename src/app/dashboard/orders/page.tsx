'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';

interface Order {
  id: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  status: string;
  timestamp: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<{ open: Order[], closed: Order[] }>({ 
    open: [], 
    closed: [] 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/exchange/orders');
        const data = await response.json();

        if (data.success) {
          setOrders({
            open: data.data?.open || [],
            closed: data.data?.closed || []
          });
        } else {
          setError(data.error || 'Failed to fetch orders');
        }
      } catch (error) {
        setError('Failed to fetch orders');
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      </Box>
    );
  }

  const renderOrders = (orderList: Order[]) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Order ID</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Side</TableCell>
          <TableCell>Price</TableCell>
          <TableCell>Amount</TableCell>
          <TableCell>Filled</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Time</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {orderList.map((order) => (
          <TableRow key={order.id}>
            <TableCell>{order.id}</TableCell>
            <TableCell>
              <Chip 
                label={order.type.toUpperCase()}
                color={order.type === 'limit_maker' ? 'secondary' : 'default'}
                size="small"
              />
            </TableCell>
            <TableCell>
              <Chip 
                label={order.side} 
                color={order.side === 'buy' ? 'success' : 'error'}
                size="small"
              />
            </TableCell>
            <TableCell>{order.price.toFixed(2)} USDT</TableCell>
            <TableCell>{order.amount.toFixed(8)} BTC</TableCell>
            <TableCell>{order.filled}/{order.amount} BTC</TableCell>
            <TableCell>
              <Chip 
                label={order.status}
                color={
                  order.status === 'closed' ? 'success' :
                  order.status === 'canceled' ? 'error' : 'primary'
                }
                size="small"
              />
            </TableCell>
            <TableCell>
              {new Date(order.timestamp).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Exchange Orders
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
          <Tab label={`Open Orders (${orders.open.length})`} />
          <Tab label={`Closed Orders (${orders.closed.length})`} />
        </Tabs>
      </Paper>

      <Paper sx={{ overflow: 'auto' }}>
        {tab === 0 ? renderOrders(orders.open) : renderOrders(orders.closed)}
      </Paper>
    </Box>
  );
} 