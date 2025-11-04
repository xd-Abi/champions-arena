import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedRoute({ children, requireProfile = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If route requires profile and user hasn't completed onboarding
  if (requireProfile && profile && !profile.name) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
