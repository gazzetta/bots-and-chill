const requiredEnvVars = [
  'DATABASE_URL',
  'ENCRYPTION_KEY',
  'MAX_ORDER_RETRIES',
  'MAX_STATUS_CHECK_RETRIES',
  'ORDER_PLACEMENT_TIMEOUT',
  'ORDER_STATUS_CHECK_INTERVAL',
  'MIN_NOTIONAL_USDT',
  'MAX_POSITION_USDT',
  'BASE_RETRY_DELAY',
  'SAFETY_ORDER_RETRY_DELAY'
] as const;

type EnvVars = typeof requiredEnvVars[number];

function validateEnv() {
  const missingVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate numeric values
  const numericVars = [
    'MAX_ORDER_RETRIES',
    'MAX_STATUS_CHECK_RETRIES',
    'ORDER_PLACEMENT_TIMEOUT',
    'ORDER_STATUS_CHECK_INTERVAL',
    'MIN_NOTIONAL_USDT',
    'MAX_POSITION_USDT',
    'BASE_RETRY_DELAY',
    'SAFETY_ORDER_RETRY_DELAY'
  ];

  numericVars.forEach((varName) => {
    const value = Number(process.env[varName]);
    if (isNaN(value) || value <= 0) {
      throw new Error(
        `Environment variable ${varName} must be a positive number`
      );
    }
  });

  // Add validation for numeric ranges
  const numericRanges: Record<string, { min: number; max: number }> = {
    MAX_ORDER_RETRIES: { min: 1, max: 10 },
    MAX_SAFETY_ORDERS_PER_DEAL: { min: 1, max: 25 },
    MIN_NOTIONAL_USDT: { min: 5, max: 100 },
    MAX_POSITION_USDT: { min: 10, max: 10000 },
    ORDER_PLACEMENT_TIMEOUT: { min: 5000, max: 60000 },
    ORDER_STATUS_CHECK_INTERVAL: { min: 500, max: 5000 }
  };

  Object.entries(numericRanges).forEach(([varName, { min, max }]) => {
    const value = Number(process.env[varName]);
    if (value < min || value > max) {
      throw new Error(
        `Environment variable ${varName} must be between ${min} and ${max}`
      );
    }
  });

  return process.env as unknown as Record<EnvVars, string>;
}

export const env = validateEnv(); 