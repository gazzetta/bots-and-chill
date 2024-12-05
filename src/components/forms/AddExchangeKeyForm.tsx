'use client';

import { useState } from 'react';

export default function AddExchangeKeyForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      exchange: formData.get('exchange'),
      name: formData.get('name'),
      apiKey: formData.get('apiKey'),
      apiSecret: formData.get('apiSecret'),
      isTestnet: formData.get('isTestnet') === 'true'
    };

    try {
      const response = await fetch('/api/exchange-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add API key');
      }

      // Reset form
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="exchange" className="block text-sm font-medium text-gray-200">
          Exchange
        </label>
        <select
          id="exchange"
          name="exchange"
          required
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          defaultValue="binance"
        >
          <option value="binance">Binance</option>
        </select>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-200">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Binance Spot Testnet"
        />
      </div>

      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-200">
          API Key
        </label>
        <input
          type="text"
          id="apiKey"
          name="apiKey"
          required
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-200">
          API Secret
        </label>
        <input
          type="password"
          id="apiSecret"
          name="apiSecret"
          required
          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isTestnet"
          name="isTestnet"
          value="true"
          defaultChecked
          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isTestnet" className="ml-2 block text-sm text-gray-200">
          Testnet
        </label>
      </div>

      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isLoading ? 'Adding...' : 'Add API Key'}
      </button>
    </form>
  );
} 