import { useAuth } from '../context/AuthContext';
import Login from '../components/admin/Login';
import Dashboard from '../components/admin/Dashboard';

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}
