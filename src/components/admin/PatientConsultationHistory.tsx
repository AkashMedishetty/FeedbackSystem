'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Phone, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, BarChart3, Eye, GitCompare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface FeedbackResponse {
  questionId: string;
  questionTitle: string;
  questionType: string;
  responseText?: string;
  responseNumber?: number;
  createdAt: Date;
}

interface ConsultationSession {
  _id: string;
  consultationNumber: number;
  consultationDate?: Date;
  submittedAt: Date;
  questionnaireType: string;
  responses: FeedbackResponse[];
  averageRating?: number;
}

interface PatientData {
  _id: string;
  name: string;
  mobileNumber: string;
  age: number;
  gender: string;
  consultations: ConsultationSession[];
}

interface PatientConsultationHistoryProps {
  patientId?: string;
  mobileNumber?: string;
  onClose?: () => void;
}

const PatientConsultationHistory: React.FC<PatientConsultationHistoryProps> = ({
  patientId,
  mobileNumber,
  onClose
}) => {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsultations, setSelectedConsultations] = useState<string[]>([]);
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'comparison'>('timeline');

  useEffect(() => {
    fetchPatientHistory();
  }, [patientId, mobileNumber]);

  const fetchPatientHistory = async () => {
    try {
      setLoading(true);
      const queryParam = patientId ? `patientId=${patientId}` : `mobileNumber=${mobileNumber}`;
      const response = await fetch(`/api/admin/patients/history?${queryParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch patient history');
      }
      
      const data = await response.json();
      setPatient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageRating = (responses: FeedbackResponse[]): number => {
    const ratingResponses = responses.filter(r => 
      r.questionType === 'rating' && typeof r.responseNumber === 'number'
    );
    
    if (ratingResponses.length === 0) return 0;
    
    const sum = ratingResponses.reduce((acc, r) => acc + (r.responseNumber || 0), 0);
    return Math.round((sum / ratingResponses.length) * 10) / 10;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const toggleConsultationSelection = (consultationId: string) => {
    setSelectedConsultations(prev => {
      if (prev.includes(consultationId)) {
        return prev.filter(id => id !== consultationId);
      } else if (prev.length < 3) {
        return [...prev, consultationId];
      }
      return prev;
    });
  };

  const getSelectedConsultations = () => {
    return patient?.consultations.filter(c => selectedConsultations.includes(c._id)) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading patient history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={fetchPatientHistory}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center text-gray-500">
        <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No patient data found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patient.name}</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                {patient.mobileNumber}
              </div>
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {patient.age} years, {patient.gender}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {patient.consultations.length} consultations
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'comparison' 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Compare
              </button>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {viewMode === 'timeline' ? (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Timeline View */}
              <div className="relative">
                {patient.consultations.map((consultation, index) => {
                  const averageRating = calculateAverageRating(consultation.responses);
                  const previousRating = index < patient.consultations.length - 1 
                    ? calculateAverageRating(patient.consultations[index + 1].responses) 
                    : averageRating;
                  const isExpanded = expandedConsultation === consultation._id;

                  return (
                    <div key={consultation._id} className="relative">
                      {/* Timeline line */}
                      {index < patient.consultations.length - 1 && (
                        <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200"></div>
                      )}
                      
                      {/* Consultation card */}
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {consultation.consultationNumber}
                          </span>
                        </div>
                        
                        <div className="flex-1 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Consultation #{consultation.consultationNumber}
                              </h3>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {format(new Date(consultation.submittedAt), 'MMM dd, yyyy')}
                                </div>
                                <div className="flex items-center">
                                  <BarChart3 className="w-4 h-4 mr-1" />
                                  {consultation.questionnaireType}
                                </div>
                                {averageRating > 0 && (
                                  <div className="flex items-center">
                                    <span className="font-medium">Rating: {averageRating}/5</span>
                                    {getTrendIcon(averageRating, previousRating)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleConsultationSelection(consultation._id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  selectedConsultations.includes(consultation._id)
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Select for comparison"
                              >
                                <GitCompare className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => setExpandedConsultation(
                                  isExpanded ? null : consultation._id
                                )}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-gray-200"
                              >
                                <div className="space-y-3">
                                  {consultation.responses.map((response, responseIndex) => (
                                    <div key={responseIndex} className="bg-white dark:bg-gray-700 p-3 rounded border dark:border-gray-600">
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                        {response.questionTitle}
                                      </h4>
                                      <div className="text-sm text-gray-600">
                                        {response.responseText && (
                                          <p className="mb-1">{response.responseText}</p>
                                        )}
                                        {response.responseNumber !== undefined && (
                                          <p className="mb-1">Rating: {response.responseNumber}/5</p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                          {response.questionType} • {formatDistanceToNow(new Date(response.createdAt))} ago
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Comparison View */}
              {selectedConsultations.length === 0 ? (
                <div className="text-center py-12">
                  <GitCompare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Select Consultations to Compare</h3>
                  <p className="text-gray-600 mb-4">Choose up to 3 consultations from the timeline to compare responses and trends.</p>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Timeline
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Comparing {selectedConsultations.length} Consultations
                    </h3>
                    <button
                      onClick={() => setSelectedConsultations([])}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Clear Selection
                    </button>
                  </div>
                  
                  <div className="grid gap-6">
                    {getSelectedConsultations().map((consultation) => {
                      const averageRating = calculateAverageRating(consultation.responses);
                      
                      return (
                        <div key={consultation._id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                Consultation #{consultation.consultationNumber}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {format(new Date(consultation.submittedAt), 'MMM dd, yyyy')} • 
                                {consultation.questionnaireType}
                                {averageRating > 0 && ` • Rating: ${averageRating}/5`}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleConsultationSelection(consultation._id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="grid gap-3">
                            {consultation.responses.map((response, index) => (
                              <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded border dark:border-gray-600">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                                  {response.questionTitle}
                                </h5>
                                <div className="text-sm text-gray-600">
                                  {response.responseText && <p>{response.responseText}</p>}
                                  {response.responseNumber !== undefined && (
                                    <p>Rating: {response.responseNumber}/5</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PatientConsultationHistory;