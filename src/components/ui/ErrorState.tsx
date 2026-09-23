import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something Went Wrong',
  message = 'We encountered an unexpected error processing your request. Please try again.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-12 bg-red-50/40 rounded-2xl border border-red-200">
      <div className="p-3.5 bg-red-100 text-red-600 rounded-full mb-3">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h4 className="text-base font-bold text-red-900">{title}</h4>
      <p className="text-xs text-red-700/80 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-5 border-red-300 text-red-800 hover:bg-red-100"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
