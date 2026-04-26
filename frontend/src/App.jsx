import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import MerchantForm from './pages/merchant/MerchantForm';
import ReviewerDashboard from './pages/reviewer/ReviewerDashboard';
import ReviewerDetail from './pages/reviewer/ReviewerDetail';

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to={userRole === 'merchant' ? '/merchant' : '/reviewer'} replace />;
  
  return children;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (token) {
    return <Navigate to={userRole === 'merchant' ? '/merchant' : '/reviewer'} replace />;
  }
  return children;
}

function App() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-10 h-10 flex items-center justify-center relative">
            {/* Background geometric shape */}
            <div className="absolute inset-0 bg-blue-600 rounded-lg rotate-45 group-hover:rotate-90 transition-transform duration-500 opacity-10"></div>
            {/* The Monogram */}
            <svg className="w-7 h-7 text-blue-600 drop-shadow-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4V20M7 12L17 4M10 12L17 20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            KYC<span className="text-blue-600">Pipeline</span>
          </span>
        </Link>

        {!['/login', '/signup'].includes(useLocation().pathname) && (
          <nav className="flex items-center gap-6">
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/login' }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg border border-slate-200"
            >
              Sign Out
            </button>
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/merchant" element={<ProtectedRoute role="merchant"><MerchantForm /></ProtectedRoute>} />
          <Route path="/reviewer" element={<ProtectedRoute role="reviewer"><ReviewerDashboard /></ProtectedRoute>} />
          <Route path="/reviewer/submission/:id" element={<ProtectedRoute role="reviewer"><ReviewerDetail /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
