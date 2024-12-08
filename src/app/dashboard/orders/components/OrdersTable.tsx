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
  const [orderBy, setOrderBy] = useState<OrderKey>('timestamp');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (property: OrderKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!a[orderBy] || !b[orderBy]) return 0;
    const comparison = String(a[orderBy]).localeCompare(String(b[orderBy]));
    return order === 'desc' ? -comparison : comparison;
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
                  active={orderBy === 'price'}
                  direction={orderBy === 'price' ? order : 'asc'}
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
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
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
                  <TableCell>{order === 'desc' ? sortedOrders.length - index : index + 1}</TableCell>
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