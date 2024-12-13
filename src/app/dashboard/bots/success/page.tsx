'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Button,
  Stack,
} from '@mui/material';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface BotDetails {
  id: string;
  name: string;
  pair: {
    symbol: string;
  };
  exchangeKey: {
    name: string;
  };
  baseOrderSize: number;
  maxSafetyOrders: number;
  priceDeviation: number;
  safetyOrderSize: number;
  safetyOrderPriceStep: number;
  safetyOrderVolumeStep: number;
  takeProfit: number;
  mode: string;
}

export default function BotSuccessPage() {
  const [bot, setBot] = useState<BotDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const botId = searchParams.get('id');

  useEffect(() => {
    const fetchBotDetails = async () => {
      try {
        if (!botId) {
          setError('No bot ID provided');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/bots/${botId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch bot details');
        }

        const data = await response.json();
        if (data.success) {
          setBot(data.bot);
        } else {
          setError(data.error || 'Failed to fetch bot details');
        }
      } catch (error) {
        console.error('Failed to fetch bot details:', error);
        setError('Failed to fetch bot details');
      } finally {
        setLoading(false);
      }
    };

    fetchBotDetails();
  }, [botId]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading bot details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button
          component={Link}
          href="/dashboard/bots"
          variant="contained"
          sx={{ mt: 2 }}
        >
          Back to Bots
        </Button>
      </Box>
    );
  }

  const handleClone = () => {
    if (!bot) return;

    // Store bot details in sessionStorage (excluding name and id)
    const cloneData = {
      pair: bot.pair,
      exchangeKey: bot.exchangeKey,
      baseOrderSize: bot.baseOrderSize,
      maxSafetyOrders: bot.maxSafetyOrders,
      priceDeviation: bot.priceDeviation,
      safetyOrderSize: bot.safetyOrderSize,
      safetyOrderPriceStep: bot.safetyOrderPriceStep,
      safetyOrderVolumeStep: bot.safetyOrderVolumeStep,
      takeProfit: bot.takeProfit,
      mode: bot.mode,
    };

    sessionStorage.setItem('cloneBotData', JSON.stringify(cloneData));
    router.push('/dashboard/bots/create');
  };

  if (!bot) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" color="success.main" gutterBottom>
        Bot Created Successfully!
      </Typography>

      <Paper sx={{ mt: 3, mb: 4 }}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Bot Name</TableCell>
              <TableCell>{bot.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Exchange</TableCell>
              <TableCell>{bot.exchangeKey.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Trading Pair</TableCell>
              <TableCell>{bot.pair.symbol}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Base Order Size</TableCell>
              <TableCell>{bot.baseOrderSize} USDT</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Safety Orders</TableCell>
              <TableCell>{bot.maxSafetyOrders}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Price Deviation</TableCell>
              <TableCell>{bot.priceDeviation}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Safety Order Size</TableCell>
              <TableCell>{bot.safetyOrderSize} USDT</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Price Step Scale</TableCell>
              <TableCell>{bot.safetyOrderPriceStep}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Volume Step Scale</TableCell>
              <TableCell>{bot.safetyOrderVolumeStep}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Take Profit</TableCell>
              <TableCell>{bot.takeProfit}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Mode</TableCell>
              <TableCell>{bot.mode}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          component={Link}
          href="/dashboard/bots"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
        >
          Back to Bots
        </Button>
        <Button
          variant="contained"
          onClick={handleClone}
          startIcon={<ContentCopyIcon />}
        >
          Create Similar Bot
        </Button>
      </Stack>

      <Box sx={{ mt: 4 }}>
        <Button
          component={Link}
          href={`/dashboard/bots/${botId}`}
          variant="contained"
          color="success"
          startIcon={<PlayArrowIcon />}
          size="large"
        >
          Start Bot Now
        </Button>
      </Box>
    </Box>
  );
} 