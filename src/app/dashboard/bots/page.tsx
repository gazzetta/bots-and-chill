'use client';

import { useEffect, useState } from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';

interface Bot {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  pair: {
    symbol: string;
  };
  baseOrderSize: number;
  maxSafetyOrders: number;
  takeProfit: number;
  mode: string;
  createdAt: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots');
      const data = await response.json();
      setBots(data.bots);
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Bots</Typography>
        <Button
          component={Link}
          href="/dashboard/bots/create"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Create Bot
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Pair</TableCell>
              <TableCell>Base Order</TableCell>
              <TableCell>Safety Orders</TableCell>
              <TableCell>Take Profit</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bots.map((bot) => (
              <TableRow key={bot.id}>
                <TableCell>{bot.id}</TableCell>
                <TableCell>{bot.name}</TableCell>
                <TableCell>{bot.pair.symbol}</TableCell>
                <TableCell>{bot.baseOrderSize}</TableCell>
                <TableCell>{bot.maxSafetyOrders}</TableCell>
                <TableCell>{bot.takeProfit}%</TableCell>
                <TableCell>{bot.mode}</TableCell>
                <TableCell>{new Date(bot.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{bot.status}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="contained"
                    component={Link}
                    href={bot.id ? `/dashboard/bots/${bot.id}` : '#'}
                    onClick={(e) => {
                      if (!bot.id) {
                        e.preventDefault();
                        console.error('No bot ID available');
                      }
                    }}
                  >
                    Show Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
} 