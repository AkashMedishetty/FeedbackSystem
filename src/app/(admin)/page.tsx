'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { 
  BarChart3, 
  MessageSquare, 
  Settings, 
  Users, 
  FileText,
  HelpCircle,
  Activity
} from 'lucide-react';
import Link from 'next/link';

const AdminDashboard = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const adminCards = [
    {
      title: 'Dashboard',
      description: 'View system overview and key metrics',
      icon: BarChart3,
      href: '/dashboard',
      color: 'bg-blue-500'
    },
    {
      title: 'Feedback Management',
      description: 'Review and manage patient feedback',
      icon: MessageSquare,
      href: '/feedback',
      color: 'bg-green-500'
    },
    {
      title: 'Analytics',
      description: 'Detailed analytics and reports',
      icon: Activity,
      href: '/analytics',
      color: 'bg-purple-500'
    },
    {
      title: 'Questions Management',
      description: 'Manage feedback questions and forms',
      icon: HelpCircle,
      href: '/questions',
      color: 'bg-orange-500'
    },
    {
      title: 'Templates',
      description: 'Manage feedback form templates',
      icon: FileText,
      href: '/templates',
      color: 'bg-indigo-500'
    },
    {
      title: 'Settings',
      description: 'System configuration and preferences',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Portal
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Welcome back, {user.name || user.email}. Manage your patient feedback system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${card.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/feedback"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500 rounded-typeform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                View Recent Feedback
              </Link>
              <Link 
                href="/questions"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500 rounded-typeform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                Add New Question
              </Link>
              <Link 
                href="/analytics"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500 rounded-typeform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                Generate Report
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;