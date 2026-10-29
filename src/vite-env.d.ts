/// <reference types="vite/client" />

declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module './context/AuthContext' {
  export const AuthProvider: any;
  export const useAuth: any;
}

declare module './components/layout/AppLayout' {
  export const AppLayout: any;
}

declare module './pages/auth/Login' {
  export const Login: any;
}

declare module './pages/auth/Register' {
  export const Register: any;
}

declare module './pages/auth/ForgotPassword' {
  export const ForgotPassword: any;
}

declare module './pages/auth/ResetPassword' {
  export const ResetPassword: any;
}

declare module './pages/Dashboard' {
  export const Dashboard: any;
}

declare module './pages/ipo/IpoList' {
  export const IpoList: any;
}

declare module './pages/ipo/AddEditIpo' {
  export const AddEditIpo: any;
}

declare module './pages/ipo/IpoDetails' {
  export const IpoDetails: any;
}

declare module './pages/portfolio/StockPortfolio' {
  export const StockPortfolio: any;
}

declare module './pages/portfolio/AddEditTransaction' {
  export const AddEditTransaction: any;
}

declare module './pages/portfolio/TransactionHistory' {
  export const TransactionHistory: any;
}

declare module './pages/reports/Reports' {
  export const Reports: any;
}

declare module './pages/settings/ProfileSettings' {
  export const ProfileSettings: any;
}
