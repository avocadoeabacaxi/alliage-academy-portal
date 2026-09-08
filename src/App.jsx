import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import NewRequest from '@/pages/NewRequest';
import RequestTypeSelection from '@/pages/RequestTypeSelection';
import EventRequestPlaceholder from '@/pages/EventRequestPlaceholder';
import PastEvent from '@/pages/PastEvent';
import PastEventSelection from '@/pages/PastEventSelection';
import PastEventForm from '@/pages/PastEventForm';
import MyRequests from '@/pages/MyRequests';
import Solicitacao from '@/pages/Solicitacao';
import RequestList from '@/pages/RequestList';
import RequestDetail from '@/pages/RequestDetail';
import Survey from '@/pages/Survey';
import UserManagement from '@/pages/UserManagement';
import Settings from '@/pages/Settings';
import Surveys from '@/pages/Surveys';
import UserAuthorization from '@/pages/UserAuthorization';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import SetPassword from '@/pages/SetPassword';
import Team from '@/pages/Team';
import Clients from '@/pages/Clients';
import TechnicalSupportRequest from '@/pages/TechnicalSupportRequest';
import SolicitacaoSupport from '@/pages/SolicitacaoSupport';
import QuickRequest from '@/pages/QuickRequest';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/set-password'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const pathname = window.location.pathname;
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));

  if (pathname.startsWith('/survey/')) {
    return <Routes><Route path="/survey/:token" element={<Survey />} /></Routes>;
  }

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/*" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      window.location.href = '/login';
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/chat" element={<QuickRequest />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/requests" element={<RequestList />} />
        <Route path="/requests/new" element={<RequestTypeSelection />} />
        <Route path="/requests/new/training" element={<NewRequest />} />
        <Route path="/requests/new/support" element={<TechnicalSupportRequest />} />
        <Route path="/requests/new/event" element={<EventRequestPlaceholder />} />
        <Route path="/solicitacao" element={<RequestTypeSelection />} />
        <Route path="/solicitacao/training" element={<Solicitacao />} />
        <Route path="/solicitacao/support" element={<SolicitacaoSupport />} />
        <Route path="/solicitacao/event" element={<EventRequestPlaceholder />} />
        <Route path="/team" element={<Team />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/requests/past" element={<PastEventSelection />} />
        <Route path="/requests/past/training" element={<PastEvent />} />
        <Route path="/requests/past/event" element={<PastEventForm />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/surveys" element={<Surveys />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/authorizations" element={<UserAuthorization />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
