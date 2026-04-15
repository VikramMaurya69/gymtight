import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to external error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // Implement error logging to external service
    // Example: Sentry.captureException(error, { extra: errorInfo });
    console.error('Logging to external service:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack
    });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-4">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={64} className="text-red-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">Oops! Something went wrong</h1>
            
            <p className="text-gray-600 text-center mb-6">
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>

            {errorCount > 3 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-600" />
                <span className="text-amber-800">Multiple errors detected. Please refresh the page or contact support.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                onClick={this.handleReset}
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              
              <button 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                onClick={this.handleGoHome}
              >
                <Home size={18} />
                Go to Homepage
              </button>
            </div>

            {isDevelopment && (
              <details className="bg-gray-50 rounded-lg p-4 mb-6">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">Error Details (Development Mode)</summary>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Error Message:</h3>
                    <pre className="bg-red-50 border border-red-200 rounded p-3 overflow-x-auto text-sm text-red-900">{error && error.toString()}</pre>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Component Stack:</h3>
                    <pre className="bg-gray-100 border border-gray-200 rounded p-3 overflow-x-auto text-sm text-gray-800">{errorInfo && errorInfo.componentStack}</pre>
                  </div>
                </div>
              </details>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-900 mb-2">If this problem persists, please contact support with the following information:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Time: {new Date().toLocaleString()}</li>
                <li>Page: {window.location.pathname}</li>
                {error && <li>Error: {error.message}</li>}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


