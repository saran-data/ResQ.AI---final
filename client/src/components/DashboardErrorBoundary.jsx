import React from 'react';

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md p-6 bg-white border border-red-200 rounded-lg shadow">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">🚨 Dashboard Error</h1>
              <p className="text-gray-700 mb-4">Something went wrong loading the dashboard.</p>
              
              <div className="text-left bg-red-50 p-3 rounded mb-4 text-sm">
                <strong>Error:</strong> {this.state.error && this.state.error.toString()}
                <br />
                <strong>Component Stack:</strong>
                <pre className="text-xs mt-1 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => {
                    // Clear localStorage and reload
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  }}
                  className="btn btn-primary w-full"
                >
                  Clear Cache & Go to Login
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="btn btn-secondary w-full"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;