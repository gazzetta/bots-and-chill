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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';

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

// Add new status type
type OrderStage = {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  message?: string;
};

interface PreviewData {
  orders: {
    base?: {
      price: number;
      // ... other order properties
    };
    takeProfit?: {
      price: number;
      // ... other order properties
    };
    safety?: Array<{
      price: number;
      // ... other order properties
    }>;
  };
  summary: {
    name: string;
    pair: string;
    baseOrderPrice: number;
    currentMarketPrice: number;
    averageEntryPrice: number;
    takeProfitPrice: number;
    totalQuantity: number;
    totalCost: number;
    numberOfOrders: number;
  };
}

export default function BotDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [bot, setBot] = useState<BotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [orderStages, setOrderStages] = useState<OrderStage[]>([
    { name: 'Base Order', status: 'pending' },
    { name: 'Take Profit Order', status: 'pending' },
    { name: 'Safety Orders', status: 'pending' },
  ]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const fetchBotDetails = async () => {
      if (!params?.id) {
        setError('No bot ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/bots/${params.id}`);
        const data = await response.json();
        console.log('API Response:', data);

        if (data.success) {
          console.log('Setting bot data:', data.bot);
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

  useEffect(() => {
    if (bot) {
      setIsRunning(bot.status === 'active');
      console.log('Bot status:', bot.status);
      console.log('Setting isRunning to:', bot.status === 'active');
    }
  }, [bot]);

  const handlePreviewOrders = async () => {
    try {
      const response = await fetch(`/api/bots/${params.id}/preview-orders`);
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data);
        setShowPreviewModal(true);
      } else {
        showMessage(data.error || 'Failed to preview orders', 'error');
      }
    } catch (error) {
      showMessage('Failed to connect to server', 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const showMessage = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleStopBot = async () => {
    try {
      const response = await fetch(`/api/bots/${params.id}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop bot');
      }

      setBot(prev => prev ? { ...prev, status: 'stopped' } : null);
      showMessage('Bot stopped successfully', 'success');
    } catch (error) {
      console.error('Failed to stop bot:', error);
      showMessage('Failed to stop bot', 'error');
    }
  };

  const renderActionButtons = () => (
    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
      <Button
        variant="contained"
        color="success"
        startIcon={<PlayArrowIcon />}
        onClick={handlePreviewOrders}
        disabled={isRunning}
      >
        Start Bot
      </Button>
      <Button
        variant="contained"
        color="error"
        startIcon={<StopIcon />}
        onClick={handleStopBot}
        disabled={!isRunning}
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
        {renderModalContent()}
      </Box>
    </Modal>
  );

  const renderStageIcon = (status: OrderStage['status']) => {
    switch (status) {
      case 'processing':
        return <CircularProgress size={20} />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const updateStage = (stageName: string, status: OrderStage['status'], message?: string) => {
    setOrderStages(stages => 
      stages.map(stage => 
        stage.name === stageName 
          ? { ...stage, status, message }
          : stage
      )
    );
  };

  const updateStageFromResponse = (data: PreviewData) => {
    // Base Order
    if (data.orders.base) {
      updateStage('Base Order', 'success', `Placed at ${data.orders.base.price} USDT`);
    } else {
      updateStage('Base Order', 'failed', 'Failed to place base order');
    }

    // Take Profit
    if (data.orders.takeProfit) {
      updateStage('Take Profit Order', 'success', `Set at ${data.orders.takeProfit.price} USDT`);
    } else {
      updateStage('Take Profit Order', 'failed', 'Failed to place take profit order');
    }

    // Safety Orders
    if (data.orders.safety) {
      const placedCount = data.orders.safety.length;
      const totalCount = bot?.maxSafetyOrders || 0;
      updateStage(
        'Safety Orders', 
        placedCount === totalCount ? 'success' : 'failed',
        `Placed ${placedCount}/${totalCount} orders`
      );
    } else {
      updateStage('Safety Orders', 'failed', 'Failed to place safety orders');
    }
  };

  const startDeal = async () => {
    // Clear previous states
    setOrderStages(stages => stages.map(stage => ({ ...stage, status: 'pending', message: undefined })));
    
    try {
      // Update Base Order stage to processing
      updateStage('Base Order', 'processing', 'Verifying API keys...');
      
      const response = await fetch(`/api/bots/${params.id}/orders`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.status === 401) {
        updateStage('Base Order', 'failed', 'Invalid API keys or insufficient permissions');
        return;
      }

      if (!response.ok) {
        updateStage('Base Order', 'failed', data.error || 'Failed to create deal');
        return;
      }

      updateStageFromResponse(data);

      // Show success for 2 seconds before redirecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push('/dashboard/deals');

    } catch (error) {
      updateStage('Base Order', 'failed', 'Network error or server unavailable');
    }
  };

  // Update the modal content
  const renderModalContent = () => (
    <Box>
      {previewData ? (
        <>
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: 'background.default',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Order Details:
            </Typography>
            <pre style={{ 
              overflow: 'auto', 
              maxHeight: '200px',
              fontSize: '0.875rem',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </Box>

          <List>
            {orderStages.map((stage) => (
              <ListItem key={stage.name}>
                <ListItemIcon>
                  {renderStageIcon(stage.status)}
                </ListItemIcon>
                <ListItemText 
                  primary={stage.name}
                  secondary={stage.message}
                />
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setShowPreviewModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={startDeal}
              disabled={orderStages.some(stage => stage.status === 'processing')}
            >
              {orderStages.some(stage => stage.status === 'processing') 
                ? 'Processing...' 
                : 'Confirm & Start Bot'}
            </Button>
          </Box>
        </>
      ) : null}
    </Box>
  );

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

  // Add a helper function to format the status
  const formatStatus = (status: string | undefined | null) => {
    if (!status) return ''; // Handle undefined/null case
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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
              <TableCell>{formatStatus(bot?.status)}</TableCell>
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

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 