'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Star, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Clock, 
  Activity, 
  FileText, 
  RefreshCw, 
  X, 
  ChevronRight, 
  AlertTriangle, 
  Eye, 
  ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IFeedbackSession, IPatient } from '@/types';

interface FilterOptions {
  mobileNumber?: string;
  consultationNumber?: number;
  department?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minRating?: number;
  maxRating?: number;
  patientName?: string;
  consultationType?: string;
  status?: string;
  hasComments?: boolean;
}

interface SortOptions {
  field: 'createdAt' | 'averageRating' | 'patientName' | 'consultationNumber' | 'department';
  direction: 'asc' | 'desc';
}

interface FeedbackViewerProps {
  initialFilters?: FilterOptions;
}

interface FeedbackData {
  sessions: (IFeedbackSession & { patientId: IPatient })[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  statistics: {
    totalSessions: number;
    uniquePatients: number;
    avgResponsesPerSession: number;
    avgRating: number;
    totalRatings: number;
  };
}

export default function FeedbackViewer({ initialFilters = {} }: FeedbackViewerProps) {
  // Helper function to calculate average rating from responses
  const calculateAverageRating = (responses: any[]): number => {
    const ratingResponses = responses.filter(r => 
      r.questionType === 'rating' && typeof r.responseNumber === 'number'
    );
    
    if (ratingResponses.length === 0) return 0;
    
    const sum = ratingResponses.reduce((acc, r) => acc + r.responseNumber, 0);
    return sum / ratingResponses.length;
  };

  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<(IFeedbackSession & { patientId: IPatient }) | null>(null);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'createdAt', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilters, setQuickFilters] = useState({
    today: false,
    thisWeek: false,
    highRated: false,
    lowRated: false,
    withComments: false
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedback = useCallback(async (offset = 0, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
        sortBy: sortOptions.field,
        sortOrder: sortOptions.direction
      });

      // Add search query
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Add filters to params
      if (filters.mobileNumber) {
        params.append('mobileNumber', filters.mobileNumber);
      }
      if (filters.consultationNumber) {
        params.append('consultationNumber', filters.consultationNumber.toString());
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo.toISOString());
      }
      if (filters.department) {
        params.append('department', filters.department);
      }

      // Add quick filters
      Object.entries(quickFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, 'true');
        }
      });

      const response = await fetch(`/api/admin/feedback?${params}`);
      const result = await response.json();

      if (result.success) {
        if (offset === 0) {
          setFeedbackData(result.data);
        } else {
          // Append to existing data for pagination
          setFeedbackData(prev => prev ? {
            ...result.data,
            sessions: [...prev.sessions, ...result.data.sessions]
          } : result.data);
        }
      } else {
        setError(result.error?.message || 'Failed to fetch feedback');
      }
    } catch (err) {
      setError('Failed to fetch feedback data');
      console.error('Error fetching feedback:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filters, sortOptions, searchQuery, quickFilters]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);



  const handleRefresh = () => {
    fetchFeedback(0, true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSort = (field: SortOptions['field']) => {
    const newDirection = sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc';
    setSortOptions({ field, direction: newDirection });
  };

  const handleQuickFilter = (filterKey: keyof typeof quickFilters) => {
    setQuickFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    setQuickFilters({
      today: false,
      thisWeek: false,
      highRated: false,
      lowRated: false,
      withComments: false
    });
  };

  const activeFiltersCount = useMemo(() => {
    const filterCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== null).length;
    const quickFilterCount = Object.values(quickFilters).filter(Boolean).length;
    const searchCount = searchQuery.trim() ? 1 : 0;
    return filterCount + quickFilterCount + searchCount;
  }, [filters, quickFilters, searchQuery]);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (feedbackData && feedbackData.pagination.hasMore) {
      fetchFeedback(feedbackData.sessions.length);
    }
  }, [feedbackData, fetchFeedback]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConsultationBadgeColor = (consultationNumber: number) => {
    switch (consultationNumber) {
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSessionDetails = (session: IFeedbackSession & { patientId: IPatient }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Feedback Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {session.patientId.name} • {session.mobileNumber} • Consultation #{session.consultationNumber}
              </p>
            </div>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
            >
              ✕
            </button>
          </div>

          {/* Session Info */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Submitted</span>
                <p className="font-medium">{formatDate(session.submittedAt)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                <p className="font-medium capitalize">{session.questionnaireType}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Responses</span>
                <p className="font-medium">{session.responses.length}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                  session.isSynced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {session.isSynced ? 'Synced' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Responses */}
          <div className="p-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Responses ({session.responses.length})
            </h4>
            <div className="space-y-4">
              {session.responses.map((response, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      {response.questionTitle}
                    </h5>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded capitalize">
                      {response.questionType}
                    </span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {response.responseText && (
                      <p>&quot;{response.responseText}&quot;</p>
                    )}
                    {response.responseNumber !== undefined && (
                      <p className="font-medium">
                        {response.questionType === 'rating' ? '⭐'.repeat(response.responseNumber) : response.responseNumber}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {formatDate(response.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="card-typeform p-6">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Feedback
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => fetchFeedback()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Feedback Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage patient feedback sessions • {feedbackData?.pagination.total || 0} total sessions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={activeFiltersCount > 0 ? "primary" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by patient name, mobile number, or consultation details..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              onClick={clearAllFilters}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter('today')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              quickFilters.today
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            Today
          </button>
          <button
            onClick={() => handleQuickFilter('thisWeek')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              quickFilters.thisWeek
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Calendar className="w-3 h-3 inline mr-1" />
            This Week
          </button>
          <button
            onClick={() => handleQuickFilter('highRated')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              quickFilters.highRated
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Star className="w-3 h-3 inline mr-1" />
            High Rated (4+)
          </button>
          <button
            onClick={() => handleQuickFilter('lowRated')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              quickFilters.lowRated
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Activity className="w-3 h-3 inline mr-1" />
            Low Rated (&lt;3)
          </button>
          <button
            onClick={() => handleQuickFilter('withComments')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              quickFilters.withComments
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FileText className="w-3 h-3 inline mr-1" />
            With Comments
          </button>
        </div>
      </div>

      {/* Enhanced Statistics */}
      {feedbackData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Sessions</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{feedbackData.statistics.totalSessions}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-xl">
                <FileText className="w-8 h-8 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl shadow-sm border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Unique Patients</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{feedbackData.statistics.uniquePatients}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Registered</p>
              </div>
              <div className="p-3 bg-green-200 dark:bg-green-800 rounded-xl">
                <User className="w-8 h-8 text-green-700 dark:text-green-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Average Rating</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{feedbackData.statistics.avgRating.toFixed(1)}</p>
                <div className="flex items-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(feedbackData.statistics.avgRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-xl">
                <Star className="w-8 h-8 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Today's Sessions</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{feedbackData.statistics.totalSessions || 0}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Last 24h</p>
              </div>
              <div className="p-3 bg-orange-200 dark:bg-orange-800 rounded-xl">
                <Clock className="w-8 h-8 text-orange-700 dark:text-orange-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 p-6 rounded-xl shadow-sm border border-teal-200 dark:border-teal-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600 dark:text-teal-400">This Week</p>
                <p className="text-3xl font-bold text-teal-900 dark:text-teal-100">{feedbackData.statistics.totalSessions || 0}</p>
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">7 days</p>
              </div>
              <div className="p-3 bg-teal-200 dark:bg-teal-800 rounded-xl">
                <Calendar className="w-8 h-8 text-teal-700 dark:text-teal-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-6 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Avg Responses</p>
                <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{feedbackData.statistics.avgResponsesPerSession}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Per session</p>
              </div>
              <div className="p-3 bg-indigo-200 dark:bg-indigo-800 rounded-xl">
                <Activity className="w-8 h-8 text-indigo-700 dark:text-indigo-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Advanced Filters
              </h3>
              <Button
                onClick={() => setShowFilters(false)}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Patient & Contact Filters */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Patient Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={filters.patientName || ''}
                    onChange={(e) => handleFilterChange({ ...filters, patientName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter patient name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={filters.mobileNumber || ''}
                    onChange={(e) => handleFilterChange({ ...filters, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consultation Number
                  </label>
                  <input
                    type="number"
                    value={filters.consultationNumber || ''}
                    onChange={(e) => handleFilterChange({ ...filters, consultationNumber: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter consultation number"
                  />
                </div>
              </div>
            </div>

            {/* Department & Type Filters */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Department & Consultation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select
                    value={filters.department || ''}
                    onChange={(e) => handleFilterChange({ ...filters, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Departments</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Radiology">Radiology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consultation Type
                  </label>
                  <select
                    value={filters.consultationType || ''}
                    onChange={(e) => handleFilterChange({ ...filters, consultationType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="In-Person">In-Person</option>
                    <option value="Telemedicine">Telemedicine</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rating & Date Filters */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-600" />
                Rating & Date Range
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Rating
                  </label>
                  <select
                    value={filters.minRating || ''}
                    onChange={(e) => handleFilterChange({ ...filters, minRating: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Any Rating</option>
                    <option value="1">1+ Stars</option>
                    <option value="2">2+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="5">5 Stars</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Rating
                  </label>
                  <select
                    value={filters.maxRating || ''}
                    onChange={(e) => handleFilterChange({ ...filters, maxRating: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Any Rating</option>
                    <option value="1">1 Star</option>
                    <option value="2">≤2 Stars</option>
                    <option value="3">≤3 Stars</option>
                    <option value="4">≤4 Stars</option>
                    <option value="5">≤5 Stars</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleFilterChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleFilterChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Additional Filters */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                Additional Options
              </h4>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasComments || false}
                    onChange={(e) => handleFilterChange({ ...filters, hasComments: e.target.checked || undefined })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Has Comments</span>
                </label>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => handleFilterChange({})}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </Button>
              <Button
                onClick={() => setShowFilters(false)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Feedback Sessions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* List Header with Sorting */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Feedback Sessions
              {feedbackData && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({feedbackData.pagination.total} total)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleSort('createdAt')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    sortOptions.field === 'createdAt'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Date {sortOptions.field === 'createdAt' && (sortOptions.direction === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('averageRating')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    sortOptions.field === 'averageRating'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Rating {sortOptions.field === 'averageRating' && (sortOptions.direction === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('patientName')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    sortOptions.field === 'patientName'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Name {sortOptions.field === 'patientName' && (sortOptions.direction === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading && !feedbackData ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading feedback sessions...</p>
              </div>
            </div>
          ) : feedbackData && feedbackData.sessions.length > 0 ? (
            feedbackData.sessions.map((session) => (
              <div
                key={session._id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {session.patientId.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {session.patientId.name || 'Unknown Patient'}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {session.mobileNumber}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            General
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(session.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="flex items-center gap-6">
                    {/* Consultation Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConsultationBadgeColor(session.consultationNumber)}`}>
                        #{session.consultationNumber}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="text-center">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(calculateAverageRating(session.responses) || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(calculateAverageRating(session.responses) || 0).toFixed(1)}
                      </div>
                    </div>

                    {/* Response Count */}
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {session.responses.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        responses
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        session.isSynced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.isSynced ? 'Synced' : 'Pending'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="mb-4">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No feedback sessions found</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {activeFiltersCount > 0 
                    ? 'Try adjusting your filters to see more results.'
                    : 'No feedback sessions have been submitted yet.'
                  }
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  className="mt-4"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Load More */}
        {feedbackData && feedbackData.pagination.hasMore && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading...
                </>
              ) : (
                'Load More Sessions'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && feedbackData && (
        renderSessionDetails(
          selectedSession!
        )
      )}
    </div>
  );
}

// Helper functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getConsultationBadgeColor = (consultationNumber: number) => {
  if (consultationNumber === 1) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  } else if (consultationNumber === 2) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  } else {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }
};