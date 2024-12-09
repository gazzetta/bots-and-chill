'use client';

import { Box, Typography } from '@mui/material';
import { DealsTable } from './components/DealsTable';
import { useEffect, useState } from 'react';

interface Deal {
  id: string;
  bot: {
    name: string;
    pair: {
      symbol: string;
    };
    maxSafetyOrders: number;
  };
  status: string;
  actualSafetyOrders: number;
  startedAt: Date;
  baseOrder?: {
    amount: number;
    filledAt: Date | null;
    price: number;
  };
  nextSafetyOrder?: {
    price: number;
  };
  takeProfit?: {
    price: number;
  };
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch('/api/deals');
        const data = await response.json();
        if (data.success) {
          setDeals(data.deals);
        }
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading deals...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Active Deals
      </Typography>
      
      <DealsTable deals={deals} />
    </Box>
  );
} 