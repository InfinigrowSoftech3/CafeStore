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
          background: '#FFFFFF',
          color: '#1C1815',
          border: '1px solid #E5DED5',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#16A34A',
            secondary: '#FFFFFF',
          },
          style: {
            borderLeft: '4px solid #16A34A',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FFFFFF',
          },
          style: {
            borderLeft: '4px solid #DC2626',
          },
        },
      }}
    />
  );
}

export default PosToaster;
