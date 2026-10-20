import React from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

/**
 * Café POS Styled Toaster Component
 * Matches the warm espresso design system tokens
 */
export function PosToaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1E1915',
          color: '#F5EDE0',
          border: '1px solid #3A3028',
          borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#4CAF7A',
            secondary: '#14110F',
          },
          style: {
            borderLeft: '4px solid #4CAF7A',
          },
        },
        error: {
          iconTheme: {
            primary: '#E5594F',
            secondary: '#14110F',
          },
          style: {
            borderLeft: '4px solid #E5594F',
          },
        },
      }}
    />
  );
}

export default PosToaster;
