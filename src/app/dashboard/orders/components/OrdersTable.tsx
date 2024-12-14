'use client';

import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, TableSortLabel, Typography, Chip 
} from '@mui/material';
import { Order } from '../types';

interface OrdersTableProps {
  orders: Order[];
  title: string;
  emptyMessage: string;
}

type OrderKey = keyof Order;

export function OrdersTable({ orders, title, emptyMessage }: OrdersTableProps) {
  const [viewsorBY, setviewsorBY] = useState<OrderKey>('timestamp');
  const [viewsortChoice, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (property: OrderKey) => {
    const isAsc = viewsorBY === property && viewsortChoice === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setviewsorBY(property);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!a[viewsorBY] || !b[viewsorBY]) return 0;
    const comparison = String(a[viewsorBY]).localeCompare(String(b[viewsorBY]));
    return viewsortChoice === 'desc' ? -comparison : comparison;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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
                  active={viewsorBY === 'timestamp'}
                  direction={viewsorBY === 'timestamp' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('timestamp')}
                >
                  Time
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={viewsorBY === 'id'}
                  direction={viewsorBY === 'id' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('id')}
                >
                  Order ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={viewsorBY === 'symbol'}
                  direction={viewsorBY === 'symbol' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('symbol')}
                >
                  Pair
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={viewsorBY === 'type'}
                  direction={viewsorBY === 'type' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('type')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={viewsorBY === 'side'}
                  direction={viewsorBY === 'side' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('side')}
                >
                  Side
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={viewsorBY === 'price'}
                  direction={viewsorBY === 'price' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('price')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Filled</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>
                <TableSortLabel
                  active={viewsorBY === 'status'}
                  direction={viewsorBY === 'status' ? viewsortChoice : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>Last Fill</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedOrders.length > 0 ? (
              sortedOrders.map((order, index) => (
                <TableRow key={order.id}>
                  <TableCell>{viewsortChoice === 'desc' ? sortedOrders.length - index : index + 1}</TableCell>
                  <TableCell>{formatDate(order.timestamp)}</TableCell>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.symbol}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.type.toUpperCase()}
                      color={order.type === 'market' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.side.toUpperCase()}
                      color={order.side === 'buy' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{order.price.toFixed(2)}</TableCell>
                  <TableCell>{order.amount.toFixed(8)}</TableCell>
                  <TableCell>{order.filled.toFixed(8)}</TableCell>
                  <TableCell>{order.cost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status.toUpperCase()}
                      color={
                        order.status === 'closed' && order.filled > 0 ? 'success' :
                        order.status === 'canceled' ? 'error' : 'primary'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {order.lastTradeTimestamp ? formatDate(order.lastTradeTimestamp) : '-'}
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