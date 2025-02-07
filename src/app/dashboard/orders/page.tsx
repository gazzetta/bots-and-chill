'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Paper, CircularProgress, Tabs, Tab } from '@mui/material';
import { OrdersTable } from './components/OrdersTable';
import { TradesTable } from './components/TradesTable';
import { Order, Trade } from './types';
import { mapCCXTOrder, mapCCXTTrade } from './utils';

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30000;

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);
  const [data, setData] = useState({
    openOrders: [] as Order[],
    closedOrders: [] as Order[],
    allOrders: [] as Order[],
    trades: [] as Trade[],
    rawResponse: null as Record<string, unknown> | null
  });

  const fetchOrders = useCallback(async (force = false) => {
    // Return cached data if within cache duration
    if (!force && Date.now() - lastFetch < CACHE_DURATION) {
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching orders from API...');
      const response = await fetch('/api/exchange/orders');
      const result = await response.json();
      
      if (result.success && result.data) {
        const openOrders = (result.data.openOrders || []).map(mapCCXTOrder);
        const closedOrders = (result.data.closedOrders || []).map(mapCCXTOrder);
        const allOrders = (result.data.allOrders || []).map(mapCCXTOrder);
        const trades = (result.data.trades || []).map(mapCCXTTrade);

        setData({
          openOrders,
          closedOrders,
          allOrders,
          trades,
          rawResponse: result.data.rawResponse
        });
        setLastFetch(Date.now());
      } else {
        console.error('API returned error:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [lastFetch]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Set up periodic refresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchOrders();
    }, CACHE_DURATION);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  // Memoize the current tab's data to prevent unnecessary re-renders
  const currentTabData = useMemo(() => {
    switch (activeTab) {
      case 0:
        return {
          Component: OrdersTable,
          props: {
            orders: data.openOrders,
            title: "Currently Active Orders",
            emptyMessage: "No open orders"
          }
        };
      case 1:
        return {
          Component: OrdersTable,
          props: {
            orders: data.closedOrders,
            title: "Completed & Cancelled Orders",
            emptyMessage: "No closed orders"
          }
        };
      case 2:
        return {
          Component: OrdersTable,
          props: {
            orders: data.allOrders,
            title: "Complete Order History",
            emptyMessage: "No orders found"
          }
        };
      case 3:
        return {
          Component: TradesTable,
          props: {
            trades: data.trades,
            title: "Executed Trades",
            emptyMessage: "No trades found"
          }
        };
      default:
        return null;
    }
  }, [activeTab, data]);

  if (loading && !data.allOrders.length) {
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

      {activeTab !== 4 && currentTabData && (
        <currentTabData.Component {...currentTabData.props} />
      )}

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