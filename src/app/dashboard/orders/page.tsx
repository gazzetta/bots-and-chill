'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Tabs, Tab } from '@mui/material';
import { OrdersTable } from './components/OrdersTable';
import { TradesTable } from './components/TradesTable';
import { Order, Trade } from './types';
import { mapCCXTOrder, mapCCXTTrade } from './utils';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    openOrders: [] as Order[],
    closedOrders: [] as Order[],
    allOrders: [] as Order[],
    trades: [] as Trade[],
    rawResponse: null as Record<string, unknown> | null
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/exchange/orders');
        const result = await response.json();
        
        if (result.success && result.data) {
          setData({
            openOrders: (result.data.openOrders || []).map(mapCCXTOrder),
            closedOrders: (result.data.closedOrders || []).map(mapCCXTOrder),
            allOrders: (result.data.allOrders || []).map(mapCCXTOrder),
            trades: (result.data.trades || []).map(mapCCXTTrade),
            rawResponse: result.data.rawResponse
          });
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Exchange Orders</Typography>
      
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="Open Orders" />
        <Tab label="Closed Orders" />
        <Tab label="All Orders" />
        <Tab label="Trade History" />
        <Tab label="Raw Response" />
      </Tabs>

      {/* Open Orders - Currently Empty */}
      {activeTab === 0 && (
        <OrdersTable 
          orders={data.openOrders}
          title="Currently Active Orders"
          emptyMessage="No open orders"
        />
      )}

      {/* Closed Orders - Shows orders with status 'closed' or 'canceled' */}
      {activeTab === 1 && (
        <OrdersTable 
          orders={data.closedOrders}
          title="Completed & Cancelled Orders"
          emptyMessage="No closed orders"
        />
      )}

      {/* All Orders - Shows complete order history */}
      {activeTab === 2 && (
        <OrdersTable 
          orders={data.allOrders}
          title="Complete Order History" 
          emptyMessage="No orders found"
        />
      )}

      {/* Trade History - Shows executed trades */}
      {activeTab === 3 && (
        <TradesTable 
          trades={data.trades}
          title="Executed Trades"
          emptyMessage="No trades found"
        />
      )}

      {/* Raw Response */}
      {activeTab === 4 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>Raw CCXT Responses</Typography>
          <pre style={{ overflow: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(data.rawResponse, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
} 