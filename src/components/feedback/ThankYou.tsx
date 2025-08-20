'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ThankYouProps {
  patientName: string;
  onStartOver: () => void;
  autoResetTime?: number; // in seconds, default 30
}

const ThankYou: React.FC<ThankYouProps> = ({ 
  patientName, 
  onStartOver, 
  autoResetTime = 30 
}) => {
  const [countdown, setCountdown] = React.useState(autoResetTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onStartOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onStartOver]);

  return (
    <div className="text-center max-w-2xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.1 
        }}
        className="mb-8"
      >
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-typeform-question mb-6">
          Thank you, {patientName}!
        </h1>
        
        <p className="text-typeform-description mb-8">
          Your feedback has been successfully submitted. We appreciate you taking the time to help us improve our services.
        </p>

        <div className="card-typeform p-8 mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600 dark:text-green-400 font-medium">
              Feedback Submitted Successfully
            </span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your responses have been recorded and will help us enhance the quality of care we provide.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>What happens next?</strong><br />
              Our team will review your feedback and use it to improve our services. If you provided contact information, we may reach out if we need any clarification.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <Button
            onClick={onStartOver}
            size="lg"
            className="min-w-[200px]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start New Feedback
          </Button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This screen will automatically reset in {countdown} seconds
          </p>
          
          <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / autoResetTime) * 100}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ThankYou;