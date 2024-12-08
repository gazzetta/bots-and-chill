'use client';

import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, TableSortLabel, Typography, Chip 
} from '@mui/material';
import { Trade } from '../types';

interface TradesTableProps {
  trades: Trade[];
  title: string;
  emptyMessage: string;
}

type TradeKey = keyof Trade;

export function TradesTable({ trades, title, emptyMessage }: TradesTableProps) {
  const [orderBy, setOrderBy] = useState<TradeKey>('timestamp');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (property: TradeKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedTrades = [...trades].sort((a, b) => {
    if (!a[orderBy] || !b[orderBy]) return 0;
    const comparison = String(a[orderBy]).localeCompare(String(b[orderBy]));
    return order === 'desc' ? -comparison : comparison;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatNumber = (num: number, decimals: number = 8) => {
    return num.toFixed(decimals);
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
      <Typography variant="h6" sx={{ p: 2 }}>{title}</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}>#</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'timestamp'}
                  direction={orderBy === 'timestamp' ? order : 'asc'}
                  onClick={() => handleSort('timestamp')}
                >
                  Time
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'id'}
                  direction={orderBy === 'id' ? order : 'asc'}
                  onClick={() => handleSort('id')}
                >
                  Trade ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'orderId'}
                  direction={orderBy === 'orderId' ? order : 'asc'}
                  onClick={() => handleSort('orderId')}
                >
                  Order ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'symbol'}
                  direction={orderBy === 'symbol' ? order : 'asc'}
                  onClick={() => handleSort('symbol')}
                >
                  Pair
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'type'}
                  direction={orderBy === 'type' ? order : 'asc'}
                  onClick={() => handleSort('type')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'side'}
                  direction={orderBy === 'side' ? order : 'asc'}
                  onClick={() => handleSort('side')}
                >
                  Side
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'takerOrMaker'}
                  direction={orderBy === 'takerOrMaker' ? order : 'asc'}
                  onClick={() => handleSort('takerOrMaker')}
                >
                  Role
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'price'}
                  direction={orderBy === 'price' ? order : 'asc'}
                  onClick={() => handleSort('price')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Fee</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTrades.length > 0 ? (
              sortedTrades.map((trade, index) => (
                <TableRow key={trade.id}>
                  <TableCell>{order === 'desc' ? sortedTrades.length - index : index + 1}</TableCell>
                  <TableCell>{formatDate(trade.timestamp)}</TableCell>
                  <TableCell>{trade.id}</TableCell>
                  <TableCell>{trade.orderId}</TableCell>
                  <TableCell>{trade.symbol}</TableCell>
                  <TableCell>
                    <Chip 
                      label={(trade.type || 'unknown').toUpperCase()}
                      color={trade.type === 'market' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={(trade.side || 'unknown').toUpperCase()}
                      color={trade.side === 'buy' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={(trade.takerOrMaker || 'unknown').toUpperCase()}
                      color={trade.takerOrMaker === 'maker' ? 'primary' : 'default'}
                      size="small"
                      title={trade.takerOrMaker === 'maker' ? 'Provided liquidity' : 'Took liquidity'}
                    />
                  </TableCell>
                  <TableCell>{formatNumber(trade.price, 2)}</TableCell>
                  <TableCell>{formatNumber(trade.amount)}</TableCell>
                  <TableCell>{formatNumber(trade.cost, 2)}</TableCell>
                  <TableCell>
                    {trade.fee ? 
                      `${formatNumber(trade.fee.cost, 8)} ${trade.fee.currency}` 
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} align="center">{emptyMessage}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
} 