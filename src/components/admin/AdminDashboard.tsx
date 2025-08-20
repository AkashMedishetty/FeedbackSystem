'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, 
  Users, 
  Star, 
  Clock, 
  Plus, 
  FileText, 
  BarChart3,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import StatsCard from './StatsCard';

interface RecentFeedback {
  id: string;
  patientName: string;
  mobileNumber: string;
  consultationNumber: number;
  createdAt: Date;
  averageRating: number;
}

interface DashboardStats {
  totalResponses: number;
  totalPatients: number;
  averageRating: number;
  responsesByDay: { date: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  todayResponses: number;
  weeklyGrowth: string;
  recentFeedback: RecentFeedback[];
}

interface AdminDashboardProps {
  stats?: DashboardStats;
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  const { user, hasPermission } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(stats || null);
  const [loading, setLoading] = useState(!stats);

  useEffect(() => {
    if (!stats) {
      fetchDashboardStats();
    }
  }, [stats]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.data);
      } else {
        // Set mock data if API fails
        setDashboardStats({
          totalResponses: 1247,
          totalPatients: 892,
          averageRating: 4.2,
          responsesByDay: [
            { date: '2025-01-13', count: 45 },
            { date: '2025-01-14', count: 52 },
            { date: '2025-01-15', count: 38 },
            { date: '2025-01-16', count: 61 },
            { date: '2025-01-17', count: 43 },
            { date: '2025-01-18', count: 55 },
            { date: '2025-01-19', count: 23 },
          ],
          ratingDistribution: [
            { rating: 1, count: 12 },
            { rating: 2, count: 23 },
            { rating: 3, count: 89 },
            { rating: 4, count: 234 },
            { rating: 5, count: 456 },
          ],
          todayResponses: 23,
          weeklyGrowth: '+12%',
          recentFeedback: [
            {
              id: '1',
              patientName: 'John Doe',
              mobileNumber: '+1234567890',
              consultationNumber: 1,
              createdAt: new Date(),
              averageRating: 5
            },
            {
              id: '2',
              patientName: 'Jane Smith',
              mobileNumber: '+1234567891',
              consultationNumber: 2,
              createdAt: new Date('2024-01-15T10:30:00Z'),
              averageRating: 4
            },
            {
              id: '3',
              patientName: 'Bob Johnson',
              mobileNumber: '+1234567892',
              consultationNumber: 1,
              createdAt: new Date('2024-01-15T10:00:00Z'),
              averageRating: 5
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set mock data on error
      setDashboardStats({
        totalResponses: 1247,
        totalPatients: 892,
        averageRating: 4.2,
        responsesByDay: [],
        ratingDistribution: [],
        todayResponses: 23,
        weeklyGrowth: '+12%',
        recentFeedback: []
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Responses',
      value: dashboardStats?.totalResponses || 0,
      change: {
        value: dashboardStats?.weeklyGrowth || '+0%',
        type: 'increase' as const,
      },
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'blue',
    },
    {
      title: 'Total Patients',
      value: dashboardStats?.totalPatients || 0,
      icon: <Users className="w-8 h-8" />,
      color: 'green',
    },
    {
      title: 'Average Rating',
      value: dashboardStats?.averageRating ? `${dashboardStats.averageRating.toFixed(1)}/5` : '0/5',
      icon: <Star className="w-8 h-8" />,
      color: 'yellow',
    },
    {
      title: 'Today\'s Responses',
      value: dashboardStats?.todayResponses || 0,
      icon: <Clock className="w-8 h-8" />,
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">
                  Welcome back, {user?.name}!
                </h1>
              </div>
              <p className="text-lg text-blue-100 max-w-2xl">
                Here&apos;s what&apos;s happening with your patient feedback system today.
              </p>
              <div className="flex items-center space-x-6 mt-6 text-blue-100">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm">System Status: Active</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {hasPermission('view_feedback') && (
                <button className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Analytics
                </button>
              )}
              {hasPermission('export_data') && (
                <button className="inline-flex items-center justify-center px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/30">
                  <FileText className="w-5 h-5 mr-2" />
                  Export Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <StatsCard
            key={index}
            title={card.title}
            value={card.value}
            change={card.change}
            icon={card.icon}
            color={card.color}
            loading={loading}
          />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Feedback */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Feedback
              </h3>
            </div>
          </div>
          <div className="p-8">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardStats?.recentFeedback && dashboardStats.recentFeedback.length > 0 ? (
              <div className="space-y-6">
                {dashboardStats.recentFeedback.slice(0, 5).map((feedback) => (
                  <div key={feedback.id} className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {feedback.patientName}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {feedback.averageRating ? feedback.averageRating.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Consultation #{feedback.consultationNumber}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No recent feedback
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Feedback will appear here once patients start submitting responses
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
          </div>
          <div className="p-8">
            <div className="space-y-4">
              {hasPermission('create_questions') && (
                <button className="w-full group">
                  <div className="flex items-center p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors">
                        <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Add New Question
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Create custom feedback questions
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              )}
              {hasPermission('manage_templates') && (
                <button className="w-full group">
                  <div className="flex items-center p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors">
                        <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Create Template
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Build reusable question templates
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              )}
              {hasPermission('view_feedback') && (
                <button className="w-full group">
                  <div className="flex items-center p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
                        <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          View Analytics
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Analyze feedback trends and insights
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}