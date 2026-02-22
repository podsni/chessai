import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Chess App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">♔</div>
            <h1 className="text-2xl font-bold mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-300 mb-6">
              The chess application encountered an error. Please refresh the
              page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-6 text-left bg-gray-800 rounded p-4">
                <summary className="cursor-pointer text-sm text-gray-400">
                  Technical Details
                </summary>
                <pre className="text-xs mt-2 text-red-300 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
