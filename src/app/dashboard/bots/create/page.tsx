'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Input,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ExchangeKey } from '@prisma/client';

interface TradingPair {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: string;
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  minNotional: number;
}

interface FormData {
  pair: TradingPair | null;
  exchangeKey: ExchangeKey | null;
  baseOrderSize: number;
  maxSafetyOrders: number;
  priceDeviation: number;
  safetyOrderSize: number;
  safetyOrderPriceStep: number;
  safetyOrderVolumeStep: number;
  takeProfit: number;
  mode: 'normal' | 'reverse';
}

const tooltips = {
  priceDeviation: 
    "After the base order is settled, a safety order will be placed when the price falls by this percentage. All Safety Orders are calculated from the price the initial Base Order was filled on the exchange account.",
  safetyOrderPriceStep: 
    "Used to multiply the deviation percentage of the last safety order to calculate the deviation percentage of the next safety order. A larger value will reduce the amount of Safety Orders your bot will require to cover a larger move in price in the opposite direction to the active deal's take profit target.",
  safetyOrderVolumeStep:
    "Used to multiply the amount of funds used by the last Safety Order that was created. For example, if set to 1.5, each safety order will be 1.5x the size of the previous order.",
  baseOrderSize:
    "The initial order size that will be placed when starting a new deal.",
  maxSafetyOrders:
    "Maximum number of safety orders that can be placed for this bot.",
  safetyOrderSize:
    "The size of the first safety order. Subsequent orders will scale based on the volume step.",
  takeProfit:
    "The percentage of profit at which the bot will close the position and take profits.",
};

const FormFieldWithTooltip = ({ 
  label, 
  value, 
  onChange, 
  tooltip, 
  endAdornment,
  maxDecimals = 2
}: { 
  label: string;
  value: number;
  onChange: (value: number) => void;
  tooltip: string;
  endAdornment?: string;
  maxDecimals?: number;
}) => {
  // Use local state to control the input value
  const [inputValue, setInputValue] = useState(value.toString());

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 1, 
        justifyContent: 'space-between' 
      }}>
        {label}
        <Tooltip title={tooltip} placement="top">
          <IconButton size="small" tabIndex={-1}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Input
        fullWidth
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={(e) => {
          const val = e.target.value;
          if (val === '' || isNaN(parseFloat(val))) {
            onChange(0);
            setInputValue('0');
          } else {
            let num = parseFloat(val);
            // For integers, ensure no decimals
            if (maxDecimals === 0) {
              num = Math.floor(num);
            } else {
              // Round to specified decimal places
              num = Number(num.toFixed(maxDecimals));
            }
            onChange(num);
            setInputValue(num.toString());
          }
        }}
        endAdornment={
          endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined
        }
      />
    </Box>
  );
};

const validateBotName = (name: string) => {
  const regex = /^[a-zA-Z0-9\s._/]+$/;
  return regex.test(name);
};

export default function CreateBotPage() {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [exchangeKeys, setExchangeKeys] = useState<ExchangeKey[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    pair: null,
    exchangeKey: null,
    baseOrderSize: 10,
    maxSafetyOrders: 5,
    priceDeviation: 1.5,
    safetyOrderSize: 15,
    safetyOrderPriceStep: 1.05,
    safetyOrderVolumeStep: 1.1,
    takeProfit: 2,
    mode: 'normal'
  });

  const [botName, setBotName] = useState('');
  const [nameError, setNameError] = useState('');

  // Add loading state for initial exchange keys fetch
  const [loadingExchangeKeys, setLoadingExchangeKeys] = useState(true);

  useEffect(() => {
    fetch('/api/exchanges')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Changed from data.exchanges to data.data to match API response
          setExchangeKeys(data.data || []);
        }
      })
      .catch(error => {
        console.error('Failed to fetch exchanges:', error);
        setExchangeKeys([]); // Set empty array on error
      });
  }, []);

  // Modify pairs fetching to include exchange filter
  useEffect(() => {
    if (searchTerm.length < 3 || !formData.exchangeKey) {
      setPairs([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trading-pairs/search?q=${searchTerm}&exchange=${formData.exchangeKey?.exchange}`);
        const data = await response.json();
        
        if (data.success) {
          setPairs(data.pairs);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch trading pairs');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, formData.exchangeKey]);

  // Add handler for exchange change
  const handleExchangeChange = (newExchangeKey: ExchangeKey | null) => {
    setFormData(prev => ({
      ...prev,
      exchangeKey: newExchangeKey,
      pair: null, // Reset pair when exchange changes
    }));
    setPairs([]); // Clear pairs list
    setSearchTerm(''); // Clear search term
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pair) {
      setError('Please select a trading pair');
      return;
    }

    if (!formData.exchangeKey) {
      setError('Please select an exchange');
      return;
    }

    if (!botName) {
      setError('Bot name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          name: botName,
          exchangeKey: formData.exchangeKey,
          baseOrderSize: Number(formData.baseOrderSize.toFixed(8)),
          maxSafetyOrders: Math.floor(formData.maxSafetyOrders),
          priceDeviation: Number(formData.priceDeviation.toFixed(2)),
          safetyOrderSize: Number(formData.safetyOrderSize.toFixed(8)),
          safetyOrderPriceStep: Number(formData.safetyOrderPriceStep.toFixed(2)),
          safetyOrderVolumeStep: Number(formData.safetyOrderVolumeStep.toFixed(2)),
          takeProfit: Number(formData.takeProfit.toFixed(2)),
        }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = `/dashboard/bots/success?id=${data.bot.id}`;
      } else {
        setError(data.error || 'Failed to create bot');
      }
    } catch (err) {
      setError('Failed to create bot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'normal' | 'reverse' | null) => {
    if (newMode === 'reverse') {
      setShowComingSoon(true);
      return;
    }
    if (newMode) {
      setFormData({ ...formData, mode: newMode });
    }
  };

  // Add a function to check if all fields are valid
  const isFormValid = () => {
    return (
      formData.pair !== null &&
      formData.exchangeKey !== null &&
      botName.trim() !== '' &&
      !nameError &&
      formData.baseOrderSize > 0 &&
      formData.maxSafetyOrders > 0 &&
      formData.priceDeviation > 0 &&
      formData.safetyOrderSize > 0 &&
      formData.safetyOrderPriceStep > 0 &&
      formData.safetyOrderVolumeStep > 0 &&
      formData.takeProfit > 0
    );
  };

  useEffect(() => {
    // Check for cloned data
    const clonedData = sessionStorage.getItem('cloneBotData');
    if (clonedData) {
      const parsedData = JSON.parse(clonedData);
      setFormData(parsedData);
      // Clear the stored data
      sessionStorage.removeItem('cloneBotData');
    }
  }, []);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create DCA Bot
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <form onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ToggleButtonGroup
              value={formData.mode}
              exclusive
              onChange={handleModeChange}
              fullWidth
            >
              <ToggleButton value="normal">Normal</ToggleButton>
              <ToggleButton value="reverse">Reverse</ToggleButton>
            </ToggleButtonGroup>

            <Autocomplete
              fullWidth
              options={exchangeKeys}
              getOptionLabel={(option) => option.name}
              value={formData.exchangeKey}
              onChange={(_, newValue) => handleExchangeChange(newValue)}
              loading={loadingExchangeKeys}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Exchange"
                  required
                  error={!!error}
                  helperText={error || 'Select exchange to use'}
                />
              )}
            />

            <Autocomplete
              fullWidth
              options={pairs}
              loading={loading}
              getOptionLabel={(option) => option.symbol}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => setFormData({ ...formData, pair: newValue })}
              onInputChange={(_, value) => setSearchTerm(value)}
              disabled={!formData.exchangeKey} // Disable if no exchange selected
              value={formData.pair}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Trading Pair"
                  required
                  error={!!error}
                  helperText={
                    !formData.exchangeKey 
                      ? 'Select an exchange first'
                      : error || 'Start typing to search (min 3 characters)'
                  }
                />
              )}
            />

            <FormFieldWithTooltip
              label="Base Order Size"
              value={formData.baseOrderSize}
              onChange={(value) => setFormData({ ...formData, baseOrderSize: value })}
              tooltip={tooltips.baseOrderSize}
              endAdornment="USDT"
              maxDecimals={8}
            />

            <FormFieldWithTooltip
              label="Max Safety Orders"
              value={formData.maxSafetyOrders}
              onChange={(value) => setFormData({ ...formData, maxSafetyOrders: value })}
              tooltip={tooltips.maxSafetyOrders}
              maxDecimals={0}  // Integer only
            />

            <FormFieldWithTooltip
              label="Price Deviation Down"
              value={formData.priceDeviation}
              onChange={(value) => setFormData({ ...formData, priceDeviation: value })}
              tooltip={tooltips.priceDeviation}
              endAdornment="%"
              maxDecimals={2}
            />

            <FormFieldWithTooltip
              label="Safety Order Size"
              value={formData.safetyOrderSize}
              onChange={(value) => setFormData({ ...formData, safetyOrderSize: value })}
              tooltip={tooltips.safetyOrderSize}
              endAdornment="USDT"
              maxDecimals={8}
            />

            <FormFieldWithTooltip
              label="Safety Order Price Step"
              value={formData.safetyOrderPriceStep}
              onChange={(value) => setFormData({ ...formData, safetyOrderPriceStep: value })}
              tooltip={tooltips.safetyOrderPriceStep}
              maxDecimals={2}
            />

            <FormFieldWithTooltip
              label="Safety Order Volume Step"
              value={formData.safetyOrderVolumeStep}
              onChange={(value) => setFormData({ ...formData, safetyOrderVolumeStep: value })}
              tooltip={tooltips.safetyOrderVolumeStep}
              maxDecimals={2}
            />

            <FormFieldWithTooltip
              label="Take Profit"
              value={formData.takeProfit}
              onChange={(value) => setFormData({ ...formData, takeProfit: value })}
              tooltip={tooltips.takeProfit}
              endAdornment="%"
              maxDecimals={2}
            />

            <TextField
              label="Bot Name"
              value={botName}
              error={!!nameError}
              helperText={nameError || "Only letters, numbers, forward slashes, spaces, dots and underscores allowed"}
              onChange={(e) => {
                const value = e.target.value;
                setBotName(value);
                if (!validateBotName(value)) {
                  setNameError('Invalid bot name format');
                } else {
                  setNameError('');
                }
              }}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!isFormValid()}
            >
              Create Bot
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={showComingSoon}
        autoHideDuration={3000}
        onClose={() => setShowComingSoon(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowComingSoon(false)} 
          severity="info"
          elevation={6}
          variant="filled"
        >
          Reverse mode coming soon!
        </Alert>
      </Snackbar>
    </Box>
  );
} 