'use client';

import { Inter } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

const inter = Inter({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Shadcn-inspired colors
const colors = {
  primary: {
    main: 'hsl(220.9 39.3% 11%)',  // Shadcn dark
    light: 'hsl(215.4 16.3% 46.9%)',
    dark: 'hsl(222.2 47.4% 11.2%)',
    contrastText: '#fff',
  },
  secondary: {
    main: 'hsl(215.3 25% 26.7%)',
    light: 'hsl(215 20.2% 65.1%)',
    dark: 'hsl(215.4 33.3% 16.9%)',
    contrastText: '#fff',
  },
  background: {
    default: '#fff',
    paper: 'hsl(0 0% 100%)',
  },
  text: {
    primary: 'hsl(222.2 47.4% 11.2%)',
    secondary: 'hsl(215.4 16.3% 46.9%)',
  },
  error: {
    main: 'hsl(0 84.2% 60.2%)',
    light: 'hsl(0 84.2% 65.2%)',
    dark: 'hsl(0 84.2% 55.2%)',
  },
  success: {
    main: 'hsl(142.1 76.2% 36.3%)',
    light: 'hsl(142.1 76.2% 41.3%)',
    dark: 'hsl(142.1 76.2% 31.3%)',
  },
};

export const theme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    ...(mode === 'light' ? {
      ...colors,
    } : {
      primary: {
        main: 'hsl(210 40% 98%)',
        light: 'hsl(215 20.2% 65.1%)',
        dark: 'hsl(210 40% 98%)',
        contrastText: 'hsl(222.2 47.4% 11.2%)',
      },
      secondary: {
        main: 'hsl(215 20.2% 65.1%)',
        light: 'hsl(215 20.2% 65.1%)',
        dark: 'hsl(215.4 33.3% 16.9%)',
        contrastText: 'hsl(222.2 47.4% 11.2%)',
      },
      background: {
        default: 'hsl(222.2 84% 4.9%)',
        paper: 'hsl(222.2 47.4% 11.2%)',
      },
      text: {
        primary: 'hsl(210 40% 98%)',
        secondary: 'hsl(215 20.2% 65.1%)',
      },
    }),
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    h1: {
      fontSize: '2.25rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 900,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h5: {
        fontSize: '1rem',
        fontWeight: 600,
        letterSpacing: '-0.025em',      
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.7,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          fontWeight: 500,
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            transform: 'scale(0.98)',
          },
        }),
        contained: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
          '&.Mui-disabled': {
            backgroundColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.12)' 
              : 'rgba(0, 0, 0, 0.12)',
            color: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(0, 0, 0, 0.26)',
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.12)' 
            : 'hsl(215.4 16.3% 46.9%)',
          '&:hover': {
            backgroundColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'hsl(215.4 16.3% 46.9% / 0.1)',
          },
          '&.Mui-disabled': {
            borderColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.12)' 
              : 'rgba(0, 0, 0, 0.12)',
            color: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(0, 0, 0, 0.26)',
          },
        }),
        text: ({ theme }) => ({
          '&:hover': {
            backgroundColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-disabled': {
            color: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(0, 0, 0, 0.26)',
          },
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.5rem',
            '& fieldset': {
              borderColor: 'hsl(215.4 16.3% 46.9% / 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'hsl(215.4 16.3% 46.9% / 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary.main,
            },
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          backgroundColor: 'hsl(215.4 16.3% 46.9% / 0.05)',
          padding: '0.5rem 1rem',
          '&:before': {
            display: 'none',
          },
          '&:after': {
            display: 'none',
          },
          '&:hover': {
            backgroundColor: 'hsl(215.4 16.3% 46.9% / 0.1)',
          },
          '&.Mui-focused': {
            backgroundColor: 'hsl(215.4 16.3% 46.9% / 0.1)',
            outline: `2px solid ${colors.primary.main}`,
            outlineOffset: '-2px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: '0.5rem',
          border: `1px solid ${
            mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.12)' 
              : 'hsl(215.4 16.3% 46.9% / 0.2)'
          }`,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          },
          '&.MuiToggleButtonGroup-grouped': {
            borderRadius: '0.5rem',
            '&:not(:first-of-type)': {
              borderLeft: `1px solid ${
                mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.12)' 
                  : 'hsl(215.4 16.3% 46.9% / 0.2)'
              }`,
            },
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.primary.main,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          padding: '0.5rem 0.75rem',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        option: {
          '&[aria-selected="true"]': {
            backgroundColor: 'hsl(215.4 16.3% 46.9% / 0.1)',
          },
          '&[data-focus="true"]': {
            backgroundColor: 'hsl(215.4 16.3% 46.9% / 0.05)',
          },
        },
      },
    },
  },
});

export default theme; 