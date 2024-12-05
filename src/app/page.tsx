import { Button, Box, Typography, Container } from '@mui/material';
import Link from 'next/link';
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Trading Bot Platform
        </Typography>
        
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          Automate your trading with our powerful DCA bot platform
        </Typography>

        <SignedIn>
          <Button
            component={Link}
            href="/dashboard"
            variant="contained"
            size="large"
            sx={{ px: 4 }}
          >
            Go to Dashboard
          </Button>
        </SignedIn>

        <SignedOut>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              component={Link}
              href="/sign-up"
              variant="contained"
              size="large"
              sx={{ px: 4 }}
            >
              Sign Up
            </Button>
            
            <Button
              component={Link}
              href="/sign-in"
              variant="outlined"
              size="large"
              sx={{ px: 4 }}
            >
              Sign In
            </Button>
          </Box>
        </SignedOut>
      </Box>
    </Container>
  );
}
