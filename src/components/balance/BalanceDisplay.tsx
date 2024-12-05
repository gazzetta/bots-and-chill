'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';

interface Balance {
  info: Record<string, unknown>;
  timestamp?: number;
  datetime?: string;
  [key: string]: {
    free: number;
    used: number;
    total: number;
  } | unknown;
}

export default function BalanceDisplay() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchBalances = async () => {
      try {
        const response = await fetch('/api/binance/balance');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        if (isMounted) {
          setBalance(data.balance);
          setIsLoading(false);
        }

      } catch (error: unknown) {
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          error
        });
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'An error occurred');
          setIsLoading(false);
        }
      }
    };

    fetchBalances();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <Box>
        <Typography>Loading balances...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {balance && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account Balance
          </Typography>
          <pre>
            {JSON.stringify(balance, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
} 