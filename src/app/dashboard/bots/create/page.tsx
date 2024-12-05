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

export default function CreateBotPage() {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    pair: null,
    baseOrderSize: 20,
    maxSafetyOrders: 13,
    priceDeviation: 1,
    safetyOrderSize: 40,
    safetyOrderPriceStep: 1.07,
    safetyOrderVolumeStep: 1.5,
    takeProfit: 3,
    mode: 'normal'
  });

  useEffect(() => {
    if (searchTerm.length < 3) {
      setPairs([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trading-pairs/search?q=${searchTerm}`);
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
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pair) {
      setError('Please select a trading pair');
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
          // Ensure all numbers are properly formatted before sending
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
        // Redirect to bots list page
        window.location.href = '/dashboard/bots';
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
      formData.baseOrderSize > 0 &&
      formData.maxSafetyOrders > 0 &&
      formData.priceDeviation > 0 &&
      formData.safetyOrderSize > 0 &&
      formData.safetyOrderPriceStep > 0 &&
      formData.safetyOrderVolumeStep > 0 &&
      formData.takeProfit > 0
    );
  };

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
              options={pairs}
              loading={loading}
              getOptionLabel={(option) => option.symbol}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => setFormData({ ...formData, pair: newValue })}
              onInputChange={(_, value) => setSearchTerm(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Trading Pair"
                  required
                  error={!!error}
                  helperText={error || 'Start typing to search (min 3 characters)'}
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