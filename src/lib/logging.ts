import { format } from 'date-fns';

export enum LogType {
  ORDER_STATUS = 'ORDER_STATUS',
  DEAL_UPDATE = 'DEAL_UPDATE',
  TP_CALCULATION = 'TP_CALCULATION',
  ERROR = 'ERROR',
  INFO = 'INFO'
}

interface LogMessage {
  type: LogType;
  dealId?: string;
  orderId?: string;
  message: string;
  data?: any;
  timestamp: string;
}

export function logMessage(type: LogType, message: string, data?: any) {
  const logEntry: LogMessage = {
    type,
    message,
    data,
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')
  };

  console.log(JSON.stringify(logEntry, null, 2));
  return logEntry;
} 