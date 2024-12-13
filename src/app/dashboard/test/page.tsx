'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Alert,
} from '@mui/material';
import { logMessage, LogType } from '@/lib/logging';

export default function TestPage() {
  const [result, setResult] = useState<string>('');

  const handleTestOrder = async (type: 'MARKET' | 'LIMIT_PO' | 'LIMIT_GTC') => {
    try {
      const response = await fetch('/api/test/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));

    } catch (error) {
      console.error('Test failed:', error);
      setResult(JSON.stringify(error, null, 2));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Test Orders
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Button 
          variant="contained" 
          onClick={() => handleTestOrder('MARKET')}
        >
          Test Market Order
        </Button>
        <Button 
          variant="contained" 
          onClick={() => handleTestOrder('LIMIT_PO')}
        >
          Test Limit PO Order
        </Button>
        <Button 
          variant="contained" 
          onClick={() => handleTestOrder('LIMIT_GTC')}
        >
          Test Limit GTC Order
        </Button>
      </Stack>

      {result && (
        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" gutterBottom>
            Response:
          </Typography>
          <pre style={{ 
            overflow: 'auto', 
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {result}
          </pre>
        </Paper>
      )}
    </Box>
  );
} 