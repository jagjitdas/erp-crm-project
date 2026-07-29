import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page">
        <h2>Access denied</h2>
        <p>Your role ({user.role}) does not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
