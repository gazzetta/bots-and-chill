'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistance, format } from 'date-fns';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  TableHead,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface DealDetails {
  id: string;
  status: string;
  averagePrice: string | number;
  currentQuantity: string | number;
  totalCost: string | number;
  startedAt: Date;
  bot: {
    name: string;
    pair: {
      symbol: string;
    };
  };
  baseOrder?: {
    amount: string | number;
    price: string | number;
    filledAt: Date;
  };
  safetyOrders: Array<{
    id: string;
    amount: string | number;
    price: string | number;
    status: string;
    filledAt?: Date;
    exchangeOrderId: number;
  }>;
  takeProfit?: {
    price: string | number;
    status: string;
  };
  currentProfit: string | number;
  profitPercent: string | number;
}

function formatNumber(value: string | number | undefined, decimals: number = 2): string {
  if (value === undefined || value === null) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '-' : num.toFixed(decimals);
}

function calculateEstimatedProfit(deal: DealDetails): string {
  if (!deal.takeProfit?.price || !deal.averagePrice || !deal.currentQuantity) {
    return '-';
  }

  const totalCost = Number(deal.averagePrice) * Number(deal.currentQuantity);
  const expectedValue = Number(deal.takeProfit.price) * Number(deal.currentQuantity);
  const profit = expectedValue - totalCost;
  
  return isNaN(profit) ? '-' : profit.toFixed(2);
}

function formatExactTime(date: Date): string {
  return format(date, "EEE do MMM HH:mm:ss 'UTC'");
}

function ProfitCalculationModal({ 
  open, 
  onClose, 
  deal 
}: { 
  open: boolean; 
  onClose: () => void; 
  deal: DealDetails; 
}) {
  const totalCost = Number(deal.averagePrice) * Number(deal.currentQuantity);
  const expectedValue = Number(deal.takeProfit?.price) * Number(deal.currentQuantity);
  const estimatedProfit = expectedValue - totalCost;
  const profitPercent = (estimatedProfit / totalCost) * 100;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Profit Calculation Details</DialogTitle>
      <DialogContent>
        <List>
          <ListItem>
            <ListItemText 
              primary="Average Entry Price" 
              secondary={`${formatNumber(deal.averagePrice)} USDT`} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Total Quantity" 
              secondary={`${formatNumber(deal.currentQuantity, 8)} ${deal.bot.pair.symbol.split('/')[0]}`} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Total Cost" 
              secondary={`${formatNumber(totalCost)} USDT`} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Take Profit Price" 
              secondary={`${formatNumber(deal.takeProfit?.price)} USDT`} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Expected Value" 
              secondary={`${formatNumber(expectedValue)} USDT`} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Estimated Profit" 
              secondary={`${formatNumber(estimatedProfit)} USDT (${formatNumber(profitPercent)}%)`}
              secondaryTypographyProps={{ 
                color: estimatedProfit > 0 ? 'success.main' : 'error.main' 
              }}
            />
          </ListItem>
        </List>
      </DialogContent>
    </Dialog>
  );
}

interface DebugAction {
  type: 'SQL_UPDATE' | 'SQL_CREATE' | 'CCXT_ORDER' | 'CCXT_CANCEL';
  description: string;
  details: any;
}

function DebugActionsModal({ 
  open, 
  onClose, 
  actions 
}: { 
  open: boolean; 
  onClose: () => void; 
  actions: DebugAction[]; 
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Debug Actions (DEV MODE)</DialogTitle>
      <DialogContent>
        <List>
          {actions.map((action, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={`${action.type}: ${action.description}`}
                secondary={
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(action.details, null, 2)}
                  </pre>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}

export default function DealDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deal, setDeal] = useState<DealDetails | null>(null);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [debugActions, setDebugActions] = useState<DebugAction[]>([]);
  const [showDebugModal, setShowDebugModal] = useState(false);

  const fetchDeal = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deals/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setDeal(data.deal);
      }
    } catch (error) {
      console.error('Failed to fetch deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/deals/${params.id}/check`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.DEV_MODE && data.actions) {
        setDebugActions(data.actions);
        setShowDebugModal(true);
      } else if (data.success && data.updated) {
        await fetchDeal();
      }
    } catch (error) {
      console.error('Failed to update deal:', error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchDeal();
  }, [params.id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!deal) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Deal not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Deal Details</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={handleUpdate}
          disabled={updating}
        >
          {updating ? 'Updating...' : 'Update Status'}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Overview</Typography>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Bot</TableCell>
              <TableCell>{deal.bot.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Pair</TableCell>
              <TableCell>{deal.bot.pair.symbol}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>{deal.status}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Average Price</TableCell>
              <TableCell>{formatNumber(deal.averagePrice)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Current Quantity</TableCell>
              <TableCell>{formatNumber(deal.currentQuantity)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Cost</TableCell>
              <TableCell>{formatNumber(deal.totalCost)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Current Position</Typography>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Average Entry Price</TableCell>
              <TableCell>{formatNumber(deal.averagePrice)} USDT</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Quantity</TableCell>
              <TableCell>{formatNumber(deal.currentQuantity, 8)} {deal.bot.pair.symbol.split('/')[0]}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Cost</TableCell>
              <TableCell>{formatNumber(deal.totalCost)} USDT</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Current Profit</TableCell>
              <TableCell sx={{ color: Number(deal.currentProfit) >= 0 ? 'success.main' : 'error.main' }}>
                {formatNumber(deal.currentProfit)} USDT ({formatNumber(deal.profitPercent)}%)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Estimated Final Profit</TableCell>
              <TableCell>
                <Box 
                  component="span" 
                  onClick={() => setShowProfitModal(true)}
                  sx={{ 
                    cursor: 'pointer', 
                    textDecoration: 'underline',
                    '&:hover': { opacity: 0.8 }
                  }}
                >
                  {calculateEstimatedProfit(deal)} USDT
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Base Order</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Amount</TableCell>
              <TableCell>Fill Price</TableCell>
              <TableCell>Fill Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                {formatNumber(deal.baseOrder?.amount, 8)} {deal.bot.pair.symbol.split('/')[0]}
              </TableCell>
              <TableCell>
                {formatNumber(deal.baseOrder?.price)} {deal.bot.pair.symbol.split('/')[1]}
              </TableCell>
              <TableCell>
                {deal.baseOrder?.filledAt ? (
                  <Box>
                    <Typography>
                      {formatExactTime(new Date(deal.baseOrder.filledAt))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistance(new Date(deal.baseOrder.filledAt), new Date(), { addSuffix: true })}
                    </Typography>
                  </Box>
                ) : '-'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Take Profit</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Target Price</TableCell>
              <TableCell>Estimated Profit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                {formatNumber(deal.takeProfit?.price)} {deal.bot.pair.symbol.split('/')[1]}
              </TableCell>
              <TableCell>
                {calculateEstimatedProfit(deal)} {deal.bot.pair.symbol.split('/')[1]}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Safety Orders</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order Number</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Target Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Fill Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deal.safetyOrders?.map((so, index) => (
              <TableRow key={so.id}>
                <TableCell>Safety Order {index + 1} <br /> 
                <Typography variant="caption" color="text.secondary">{so.exchangeOrderId}</Typography>
                


                </TableCell>
                <TableCell>
                  {formatNumber(so.amount, 8)} {deal.bot.pair.symbol.split('/')[0]}
                </TableCell>
                <TableCell>
                  {formatNumber(so.price)} {deal.bot.pair.symbol.split('/')[1]}
                </TableCell>
                <TableCell>{so.status}</TableCell>
                <TableCell>
                  {so.filledAt ? formatDistance(new Date(so.filledAt), new Date(), { addSuffix: true }) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <ProfitCalculationModal 
        open={showProfitModal} 
        onClose={() => setShowProfitModal(false)} 
        deal={deal} 
      />

      <DebugActionsModal 
        open={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        actions={debugActions}
      />
    </Box>
  );
} 