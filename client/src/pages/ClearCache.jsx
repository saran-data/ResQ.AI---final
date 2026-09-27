import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ClearCache = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all local storage
    localStorage.clear();
    
    // Redirect to login after a brief delay
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="text-4xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Clearing Cache...</h1>
        <p className="text-gray-600 mb-4">Redirecting to login page...</p>
        <div className="spinner mx-auto"></div>
      </div>
    </div>
  );
};

export default ClearCache;