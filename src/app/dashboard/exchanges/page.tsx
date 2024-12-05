'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { addExchangeKey } from '@/app/actions/exchange-keys';

const exchanges = [
  { value: 'binance_testnet', label: 'Binance Testnet', isTestnet: true },
  { value: 'binance', label: 'Binance', isTestnet: false },
];

interface ExchangeKey {
  id: string;
  exchange: string;
  name: string;
  isTestnet: boolean;
  createdAt: string;
}

export default function ExchangesPage() {
  const [formData, setFormData] = useState({
    exchange: '',
    apiKey: '',
    apiSecret: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [connectedExchanges, setConnectedExchanges] = useState<ExchangeKey[]>([]);

  useEffect(() => {
    // Fetch connected exchanges
    fetch('/api/exchanges')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConnectedExchanges(data.exchanges);
        }
      })
      .catch(console.error);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    try {
      const result = await addExchangeKey(formData);

      if (result.success) {
        setStatus({
          type: 'success',
          message: 'API keys saved successfully!',
        });
        // Clear form on success
        setFormData({ exchange: '', apiKey: '', apiSecret: '' });
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to save API keys. Please try again.',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Exchange Connections
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connect your exchange accounts to start trading
      </Typography>

      <Paper sx={{ maxWidth: 600, mx: 'auto', p: 4 }}>
        {status.type && (
          <Alert severity={status.type} sx={{ mb: 3 }}>
            {status.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="exchange-select-label">Exchange</InputLabel>
            <Select
              labelId="exchange-select-label"
              value={formData.exchange}
              label="Exchange"
              onChange={(e) =>
                setFormData({ ...formData, exchange: e.target.value })
              }
              required
            >
              {exchanges.map((exchange) => (
                <MenuItem key={exchange.value} value={exchange.value}>
                  {exchange.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="API Key"
            value={formData.apiKey}
            onChange={(e) =>
              setFormData({ ...formData, apiKey: e.target.value })
            }
            sx={{ mb: 3 }}
            required
          />

          <TextField
            fullWidth
            label="API Secret"
            type={showSecret ? 'text' : 'password'}
            value={formData.apiSecret}
            onChange={(e) =>
              setFormData({ ...formData, apiSecret: e.target.value })
            }
            sx={{ mb: 4 }}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle secret visibility"
                    onClick={() => setShowSecret(!showSecret)}
                    edge="end"
                  >
                    {showSecret ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              sx={{ flex: 1 }}
            >
              Save API Keys
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() =>
                setFormData({ exchange: '', apiKey: '', apiSecret: '' })
              }
              sx={{ flex: 1 }}
            >
              Clear Form
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Connected Exchanges List */}
      <Paper sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 4 }}>
        <Typography variant="h6" gutterBottom>
          Connected Exchanges
        </Typography>
        {connectedExchanges.length > 0 ? (
          <List>
            {connectedExchanges.map((exchange) => (
              <ListItem key={exchange.id}>
                <ListItemText
                  primary={exchange.name}
                  secondary={`Connected on ${new Date(exchange.createdAt).toLocaleDateString()}`}
                />
                <Chip
                  label={exchange.isTestnet ? 'Testnet' : 'Mainnet'}
                  color={exchange.isTestnet ? 'warning' : 'success'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            No exchanges connected yet.
          </Typography>
        )}
      </Paper>
    </Box>
  );
} 