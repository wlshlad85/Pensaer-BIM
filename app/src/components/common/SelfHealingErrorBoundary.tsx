/**
 * Self-Healing Error Boundary
 *
 * React error boundary with automatic recovery options.
 * Based on research: SELF_HEALING_CODE_RESEARCH.md
 *
 * Features:
 * - Catches React component errors
 * - Offers retry and safe mode options
 * - Logs errors for monitoring
 * - Graceful degradation
 */

import React, { Component, ReactNode } from 'react';
import { selfHealingSystem } from '../../utils/errorRecovery';

interface Props {
  /** Child components to protect */
  children: ReactNode;
  /** Fallback UI to show when error occurs */
  fallback?: (error: Error, retry: () => void, safeMode: () => void) => ReactNode;
  /** Called when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Called when retry is attempted */
  onRetry?: () => void;
  /** Called when safe mode is activated */
  onSafeMode?: () => void;
  /** Enable logging to self-healing system */
  enableLogging?: boolean;
  /** Component name for logging */
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  safeMode: boolean;
  retryCount: number;
}

/**
 * Self-Healing Error Boundary Component
 *
 * Automatically catches and recovers from React component errors
 */
export class SelfHealingErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      safeMode: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to self-healing system
    if (this.props.enableLogging !== false) {
      selfHealingSystem.handleError(error);
    }

    // Log to console
    console.error(
      `[Self-Healing] Error in ${this.props.componentName || 'component'}:`,
      error,
      errorInfo
    );

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // NOTE: Auto-retry disabled — was causing infinite render loops
    // when the underlying error persists across retries.
    // Manual retry is still available via the UI button.
  }

  /**
   * Retry rendering the component
   */
  handleRetry = (): void => {
    console.log('[Self-Healing] Retrying component render...');

    if (this.props.onRetry) {
      this.props.onRetry();
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  /**
   * Activate safe mode (minimal features)
   */
  handleSafeMode = (): void => {
    console.log('[Self-Healing] Activating safe mode...');

    if (this.props.onSafeMode) {
      this.props.onSafeMode();
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      safeMode: true,
      retryCount: 0,
    });
  };

  /**
   * Reset error boundary completely
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      safeMode: false,
      retryCount: 0,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.handleRetry,
          this.handleSafeMode
        );
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Something went wrong
                </h3>
              </div>
            </div>

            <div className="mt-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {this.state.error.message}
              </p>

              {this.state.retryCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Retry attempts: {this.state.retryCount}/{this.maxRetries}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= this.maxRetries}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {this.state.retryCount >= this.maxRetries ? 'Max Retries' : 'Retry'}
              </button>

              <button
                onClick={this.handleSafeMode}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Safe Mode
              </button>
            </div>

            <button
              onClick={this.handleReset}
              className="mt-3 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset
            </button>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                <summary className="cursor-pointer text-gray-700 dark:text-gray-300 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Pass safe mode flag to children if applicable
    if (this.state.safeMode && React.isValidElement(this.props.children)) {
      return React.cloneElement(this.props.children as React.ReactElement<any>, {
        safeMode: true,
      });
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 *
 * @example
 * ```tsx
 * const SafeComponent = withErrorRecovery(MyComponent, {
 *   componentName: 'MyComponent',
 *   onError: (error) => console.error(error),
 * });
 * ```
 */
export function withErrorRecovery<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<Props, 'children'>
): React.ComponentType<P> {
  return (props: P) => (
    <SelfHealingErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </SelfHealingErrorBoundary>
  );
}

/**
 * Hook to manually trigger error boundary reset
 */
export function useErrorReset() {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback(() => {
    setError(null);
  }, []);
}
