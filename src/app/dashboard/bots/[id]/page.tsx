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
  Modal,
  CircularProgress,
} from '@mui/material';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { DealCreationStatus } from '@/components/DealCreationStatus';

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
  status: string;
}

export default function BotDetailsPage() {
  const [bot, setBot] = useState<BotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creationStatus, setCreationStatus] = useState<{
    status: 'idle' | 'creating' | 'checking' | 'retrying' | 'failed' | 'success';
    attempt?: number;
    error?: string;
    marketPrice?: number;
    desiredPrice?: number;
  }>({ status: 'idle' });
  const params = useParams();

  useEffect(() => {
    const fetchBotDetails = async () => {
      if (!params?.id) {
        setError('No bot ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/bots/${params.id}`);
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
  }, [params?.id]);

  const handlePreviewOrders = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/bots/${params.id}/preview-orders`);
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data);
        setShowPreviewModal(true);
      } else {
        console.error('Failed to preview orders:', data.error);
      }
    } catch (error) {
      console.error('Failed to preview orders:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const renderActionButtons = () => (
    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
      <Button
        variant="contained"
        color="success"
        startIcon={<PlayArrowIcon />}
        onClick={handlePreviewOrders}
        disabled={bot?.status === 'active' || previewLoading}
      >
        {previewLoading ? <CircularProgress size={24} color="inherit" /> : 'Start Bot'}
      </Button>
      <Button
        variant="contained"
        color="error"
        startIcon={<StopIcon />}
        disabled={bot?.status !== 'active'}
      >
        Stop Bot
      </Button>
    </Stack>
  );

  const renderPreviewModal = () => (
    <Modal
      open={showPreviewModal}
      onClose={() => setShowPreviewModal(false)}
      aria-labelledby="preview-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: 800,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <Typography id="preview-modal-title" variant="h6" component="h2" gutterBottom>
          Preview Orders
        </Typography>
        {previewData && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Summary
            </Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(previewData.summary, null, 2)}
              </pre>
            </Paper>
            <Typography variant="subtitle1" gutterBottom>
              Orders
            </Typography>
            <Paper sx={{ p: 2 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(previewData.orders, null, 2)}
              </pre>
            </Paper>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={() => setShowPreviewModal(false)}>
                Cancel
              </Button>
              <Button variant="contained" color="primary">
                Confirm & Start Bot
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );

  const startDeal = async () => {
    setCreationStatus({ status: 'creating' });
    
    try {
      const response = await fetch(`/api/bots/${params.id}/orders`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setCreationStatus({ 
          status: 'failed',
          error: data.error || 'Failed to create deal'
        });
        return;
      }

      if (data.attempt > 1) {
        // Show that we had to retry
        setCreationStatus({
          status: 'retrying',
          attempt: data.attempt,
          marketPrice: data.currentPrice,
          desiredPrice: data.desiredPrice
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Show retry message
      }

      setCreationStatus({ status: 'success' });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Show success message
      
      // Redirect to deals page
      router.push('/dashboard/deals');

    } catch (error) {
      setCreationStatus({
        status: 'failed',
        error: error.message || 'An unexpected error occurred'
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading bot details...</Typography>
      </Box>
    );
  }

  // Show error state
  if (error || !bot) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error || 'Bot not found'}</Typography>
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

  return (
    <Box sx={{ p: 3 }}>
      {renderActionButtons()}
      <Typography variant="h4" gutterBottom>
        Bot Details
      </Typography>
      
      <Paper sx={{ mt: 3, mb: 4 }}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Bot ID</TableCell>
              <TableCell>{bot.id}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Name</TableCell>
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
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Volume Scale</TableCell>
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
            <TableRow>
              <TableCell component="th" sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell>{bot.status}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      
      {renderPreviewModal()}

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
        <Button
          component={Link}
          href="/dashboard/bots"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
        >
          Back to Bots
        </Button>
      </Stack>

      {creationStatus.status !== 'idle' && (
        <DealCreationStatus {...creationStatus} />
      )}
    </Box>
  );
} 