'use client';

import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { UserButton } from '@clerk/nextjs';
import { useColorMode } from '@/hooks/useColorMode';
import Sidebar from '@/components/layout/Sidebar';
import { useStore } from '@/lib/store';

const DRAWER_WIDTH = 240;

export default function DashboardClient({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { toggleColorMode, mode } = useColorMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { initialized, setInitialized } = useStore();

  useEffect(() => {
    const initializeApp = async () => {
      if (initialized) return;
      
      try {
        const response = await fetch('/api/init');
        if (response.ok) {
          setInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    initializeApp();

    return () => {
      if (initialized) {
        fetch('/api/websocket/cleanup', { method: 'POST' }).catch(console.error);
      }
    };
  }, [initialized, setInitialized]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="nav"
        sx={{
          width: isCollapsed ? 64 : DRAWER_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <Sidebar 
          mobileOpen={mobileOpen}
          isCollapsed={isCollapsed}
          onMobileClose={() => setMobileOpen(false)}
          onCollapse={() => setIsCollapsed(!isCollapsed)}
          drawerWidth={DRAWER_WIDTH}
        />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar 
          position="static" 
          elevation={0}
          sx={{
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography color="text.primary" variant="h3" component="div" sx={{ flexGrow: 1 }}>
              Dashboard
            </Typography>
            <IconButton 
              onClick={toggleColorMode}
              color="inherit"
              sx={{ mr: 2 }}
            >
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <UserButton afterSignOutUrl="/" />
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3, flexGrow: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
} 