import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { formatDistance } from 'date-fns';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tooltip,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

export default async function DealsPage() {
  const { userId } = await auth();
  
  const deals = await prisma.deal.findMany({
    where: {
      bot: {
        userId: userId,
      },
      status: {
        not: 'COMPLETED'
      }
    },
    include: {
      bot: {
        include: {
          pair: true,
        }
      },
      orders: true,
    },
    orderBy: {
      startedAt: 'desc'
    }
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Active Deals
      </Typography>
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bot</TableCell>
              <TableCell>Pair</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Safety Orders</TableCell>
              <TableCell align="right">Current Profit</TableCell>
              <TableCell>Started</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>{deal.bot.name}</TableCell>
                <TableCell>{deal.bot.pair.symbol}</TableCell>
                <TableCell>
                  <Tooltip title={deal.warningMessage || ''}>
                    <Chip
                      icon={deal.warningMessage ? <WarningIcon /> : undefined}
                      label={deal.warningMessage ? 'Partial Setup' : deal.status}
                      color={
                        deal.warningMessage ? 'warning' :
                        deal.status === 'ACTIVE' ? 'success' :
                        deal.status === 'PENDING' ? 'info' : 'error'
                      }
                      size="small"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip title={deal.warningMessage ? `${deal.actualSafetyOrders} of ${deal.bot.maxSafetyOrders} placed` : ''}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {deal.actualSafetyOrders}/{deal.bot.maxSafetyOrders}
                      {deal.warningMessage && <InfoIcon color="warning" fontSize="small" />}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    color={deal.currentProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {deal.currentProfit.toFixed(2)}%
                  </Typography>
                </TableCell>
                <TableCell>
                  {formatDistance(new Date(deal.startedAt), new Date(), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {deals.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No active deals found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
} 