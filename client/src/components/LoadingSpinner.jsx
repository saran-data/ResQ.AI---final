const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">{message}</p>
        <p className="text-sm text-gray-500 mt-2">If this persists, try refreshing the page</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;