import { Box, Button, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';

interface Deal {
  id: string;
  bot: {
    name: string;
    pair: {
      symbol: string;
    };
    maxSafetyOrders: number;
  };
  status: string;
  averagePrice: number;
  actualSafetyOrders: number;
  startedAt: Date;
  orders?: Array<{
    type: string;
    status: string;
  }>;
  nextSafetyOrder?: {
    price: number;
  };
  takeProfit?: {
    price: number;
  };
}

export function DealsTable({ deals }: { deals: Deal[] }) {
  const router = useRouter();

  const columns: GridColDef[] = [
    { 
      field: 'bot', 
      headerName: 'Bot', 
      width: 150,
      valueGetter: (params) => params.row.bot.name 
    },
    { 
      field: 'pair', 
      headerName: 'Pair', 
      width: 120,
      valueGetter: (params) => params.row.bot.pair.symbol 
    },
    {
      field: 'averagePrice',
      headerName: 'Average Price',
      width: 120,
      valueFormatter: (params) => {
        const value = params.value;
        return value ? Number(value).toFixed(2) : '-';
      }
    },
    {
      field: 'nextSafetyOrderPrice',
      headerName: 'Next SO Price',
      width: 120,
      valueFormatter: (params) => {
        const value = params.value;
        return value ? Number(value).toFixed(2) : '-';
      }
    },
    {
      field: 'takeProfitPrice',
      headerName: 'TP Price',
      width: 120,
      valueFormatter: (params) => {
        const value = params.value;
        return value ? Number(value).toFixed(2) : '-';
      }
    },
    {
      field: 'safetyOrders',
      headerName: 'Safety Orders',
      width: 120,
      renderCell: (params) => (
        <Box>
          {params.row.filledSafetyOrders}/{params.row.maxSafetyOrders}
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={params.value === 'ACTIVE' ? 'success' : 'default'}
          size="small"
          // sx is MUI's styling prop that accepts CSS-in-JS object
          // It's similar to the style prop but with added features specific to MUI
          // Here we use it to set the text color to white
          sx={{ color: 'white' }}
        />
      )
    },
    {
      field: 'started',
      headerName: 'Started',
      width: 150,
      valueGetter: (params) => params.row.startedAt,
      valueFormatter: (params) => {
        const value = params.value;
        return value ? formatDistance(new Date(value), new Date(), { addSuffix: true }) : '-';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => router.push(`/dashboard/deals/${params.row.id}`)}
        >
          Details
        </Button>
      )
    }
  ];

  const rows = deals.map(deal => ({
    id: deal.id,
    bot: deal.bot,
    averagePrice: deal.averagePrice,
    nextSafetyOrderPrice: deal.nextSafetyOrder?.price,
    takeProfitPrice: deal.takeProfit?.price,
    filledSafetyOrders: deal.orders?.filter(o => o.type === 'SAFETY' && o.status === 'FILLED').length || 0,
    maxSafetyOrders: deal.bot.maxSafetyOrders,
    status: deal.status,
    startedAt: deal.startedAt
  }));

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      autoHeight
      disableRowSelectionOnClick
      initialState={{
        sorting: {
          sortModel: [{ field: 'startedAt', sort: 'desc' }]
        }
      }}
    />
  );
} 