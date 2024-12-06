import { useState, useEffect } from 'react';

interface DealCreationStatusProps {
  status: 'creating' | 'checking' | 'retrying' | 'failed' | 'success';
  attempt?: number;
  error?: string;
  marketPrice?: number;
  desiredPrice?: number;
}

export function DealCreationStatus({ status, attempt = 1, error, marketPrice, desiredPrice }: DealCreationStatusProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          {status === 'creating' && (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />
              <span>Creating deal...</span>
            </>
          )}
          
          {status === 'checking' && (
            <>
              <div className="animate-pulse h-8 w-8 bg-yellow-500 rounded-full mr-3" />
              <span>Checking order status...</span>
            </>
          )}
          
          {status === 'retrying' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
              <span className="block">Price dropped below our order</span>
              <span className="block text-sm text-gray-500">
                Attempt {attempt} - Retrying with new price...
              </span>
              {marketPrice && desiredPrice && (
                <div className="mt-2 text-sm">
                  <div>Market: ${marketPrice.toFixed(2)}</div>
                  <div>Target: ${desiredPrice.toFixed(2)}</div>
                </div>
              )}
            </div>
          )}
          
          {status === 'failed' && (
            <div className="text-center text-red-600">
              <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="block font-medium">Failed to create deal</span>
              {error && <span className="block text-sm mt-1">{error}</span>}
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center text-green-600">
              <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Deal created successfully!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 