import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface LoginCredentials {
  email: string;
  password: string;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return false;
      }

      if (result?.ok) {
        router.push('/dashboard');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (action: string): boolean => {
    if (!session?.user?.role) return false;

    const permissions = {
      admin: [
        'create_questions',
        'edit_questions',
        'delete_questions',
        'view_feedback',
        'export_data',
        'manage_users',
        'manage_settings',
        'manage_templates',
        'manage_consultation_rules'
      ],
      manager: [
        'create_questions',
        'edit_questions',
        'view_feedback',
        'export_data',
        'manage_templates',
        'manage_consultation_rules'
      ],
      viewer: [
        'view_feedback'
      ]
    };

    return permissions[session.user.role as keyof typeof permissions]?.includes(action) || false;
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!session?.user?.role) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(session.user.role);
  };

  return {
    user: session?.user || null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || isLoading,
    error,
    login,
    logout,
    hasPermission,
    hasRole,
    clearError: () => setError(null),
  };
}