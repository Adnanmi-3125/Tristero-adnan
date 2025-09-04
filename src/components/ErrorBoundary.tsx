import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
          <div className="bg-red-900 border border-red-600 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-300 mb-4">Something went wrong</h2>
            <p className="text-red-200 mb-4">
              The application encountered an error. Please refresh the page to try again.
            </p>
            <details className="mb-4">
              <summary className="cursor-pointer text-red-300 hover:text-red-200">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-100 bg-red-800 p-2 rounded overflow-auto">
                {this.state.error?.stack || this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}