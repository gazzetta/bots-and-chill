'use client';

import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  IconButton,
  Box,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TradingBotsIcon,
  AccountBalance as ExchangesIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  mobileOpen: boolean;
  isCollapsed: boolean;
  onMobileClose: () => void;
  onCollapse: () => void;
  drawerWidth: number;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: DashboardIcon,
  },
  {
    name: 'Trading Bots',
    icon: TradingBotsIcon,
    children: [
      { name: 'My Bots', href: '/dashboard/bots' },
      { name: 'My Deals', href: '/dashboard/deals' },
    ]
  },
  {
    name: 'Exchanges',
    href: '/dashboard/exchanges',
    icon: ExchangesIcon,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: SettingsIcon,
  },
];

export default function Sidebar({
  mobileOpen,
  isCollapsed,
  onMobileClose,
  onCollapse,
  drawerWidth,
}: SidebarProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState(pathname.includes('/dashboard/bots') || pathname.includes('/dashboard/deals'));

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end',
        p: 1
      }}>
        <IconButton onClick={onCollapse}>
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
      
      <List>
        {navigation.map((item) => (
          !item.children ? (
            <ListItem key={item.name} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={pathname === item.href}
              >
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary={item.name} />}
              </ListItemButton>
            </ListItem>
          ) : (
            <Box key={item.name}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => setOpenSubmenu(!openSubmenu)}>
                  <ListItemIcon>
                    <item.icon />
                  </ListItemIcon>
                  {!isCollapsed && (
                    <>
                      <ListItemText primary={item.name} />
                      {openSubmenu ? <ExpandLess /> : <ExpandMore />}
                    </>
                  )}
                </ListItemButton>
              </ListItem>
              <Collapse in={openSubmenu && !isCollapsed} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.name}
                      component={Link}
                      href={child.href}
                      selected={pathname === child.href}
                      sx={{ pl: 4 }}
                    >
                      <ListItemText primary={child.name} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          )
        ))}
      </List>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: isCollapsed ? 64 : drawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
} 