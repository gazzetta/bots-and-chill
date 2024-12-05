import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';

export default function BotsPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Trading Bots
        </Typography>
        <Button
          component={Link}
          href="/dashboard/bots/create"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Create Bot
        </Button>
      </Box>

      {/* Bot list will go here */}
      <Typography color="text.secondary">
        No bots created yet. Click the button above to create your first bot.
      </Typography>
    </Box>
  );
} 