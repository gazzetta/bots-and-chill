interface OrderStatus {
  id: string;
  type: 'BASE' | 'SAFETY' | 'TAKE_PROFIT';
  exchangeOrderId: string;
  price: number;
  quantity: number;
  filled: number;
  status: string;
}

// Visual representation
const OrderStatusDisplay = ({ orders }: { orders: OrderStatus[] }) => (
  <Box>
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
        {/* Base Order */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1">Base Order</Typography>
            <Chip 
              label={orders[0].status} 
              color={orders[0].status === 'FILLED' ? 'success' : 'primary'}
            />
            <Typography>
              Price: {orders[0].price} USDT | 
              Filled: {orders[0].filled}/{orders[0].quantity} BTC
            </Typography>
          </Box>
        </Grid>

        {/* Safety Orders */}
        <Grid item xs={12}>
          <Typography variant="subtitle1">Safety Orders</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Filled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.filter(o => o.type === 'SAFETY').map((order, i) => (
                  <TableRow key={order.id}>
                    <TableCell>SO{i + 1}</TableCell>
                    <TableCell>{order.price}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small"
                        label={order.status}
                        color={order.status === 'FILLED' ? 'success' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>{order.filled}/{order.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Take Profit */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1">Take Profit</Typography>
            <Chip 
              label={orders[orders.length - 1].status}
              color={orders[orders.length - 1].status === 'FILLED' ? 'success' : 'primary'}
            />
            <Typography>
              Price: {orders[orders.length - 1].price} USDT
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  </Box>
); 