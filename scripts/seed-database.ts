import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../src/lib/db/connection';
import Patient from '../src/lib/db/models/Patient';
import Question from '../src/lib/db/models/Question';
import QuestionTemplate from '../src/lib/db/models/QuestionTemplate';
import ConsultationRules from '../src/lib/db/models/ConsultationRules';
import AdminUser from '../src/lib/db/models/AdminUser';
import HospitalSettings from '../src/lib/db/models/HospitalSettings';
import FeedbackSession from '../src/lib/db/models/FeedbackSession';

// Sample Questions Data
const sampleQuestions = [
  {
    type: 'rating',
    title: 'How would you rate your overall experience today?',
    description: 'Please rate your experience from 1 (very poor) to 5 (excellent)',
    required: true,
    minValue: 1,
    maxValue: 5,
    orderIndex: 1,
    isActive: true
  },
  {
    type: 'multipleChoice',
    title: 'How did you hear about our services?',
    description: 'Please select one option',
    required: false,
    options: ['Friend/Family Referral', 'Doctor Referral', 'Online Search', 'Social Media', 'Advertisement', 'Walk-in'],
    orderIndex: 2,
    isActive: true
  },
  {
    type: 'yesNo',
    title: 'Would you recommend our services to others?',
    description: 'Your recommendation helps us improve',
    required: true,
    orderIndex: 3,
    isActive: true
  },
  {
    type: 'text',
    title: 'What did you like most about your visit?',
    description: 'Please share what stood out positively',
    required: false,
    placeholder: 'Share your positive experience...',
    validation: {
      maxLength: 500
    },
    orderIndex: 4,
    isActive: true
  },
  {
    type: 'text',
    title: 'How can we improve our services?',
    description: 'Your suggestions help us serve you better',
    required: false,
    placeholder: 'Share your suggestions...',
    validation: {
      maxLength: 500
    },
    orderIndex: 5,
    isActive: true
  },
  {
    type: 'rating',
    title: 'How would you rate the cleanliness of our facility?',
    description: 'Rate from 1 (very poor) to 5 (excellent)',
    required: true,
    minValue: 1,
    maxValue: 5,
    orderIndex: 6,
    isActive: true
  },
  {
    type: 'rating',
    title: 'How would you rate the staff friendliness?',
    description: 'Rate from 1 (very poor) to 5 (excellent)',
    required: true,
    minValue: 1,
    maxValue: 5,
    orderIndex: 7,
    isActive: true
  },
  {
    type: 'multipleChoice',
    title: 'Which department did you visit today?',
    description: 'Select the primary department',
    required: true,
    options: ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Emergency', 'Radiology', 'Laboratory'],
    orderIndex: 8,
    isActive: true
  },
  {
    type: 'scale',
    title: 'How long did you wait before being seen?',
    description: 'Rate your waiting time experience (1 = too long, 10 = very quick)',
    required: false,
    minValue: 1,
    maxValue: 10,
    orderIndex: 9,
    isActive: true
  },
  {
    type: 'yesNo',
    title: 'Did the staff explain your treatment clearly?',
    description: 'Clear communication is important to us',
    required: true,
    orderIndex: 10,
    isActive: true
  },
  {
    type: 'multipleChoice',
    title: 'How would you prefer to receive follow-up information?',
    description: 'Select your preferred communication method',
    required: false,
    options: ['SMS', 'Email', 'Phone Call', 'WhatsApp', 'No follow-up needed'],
    orderIndex: 11,
    isActive: true
  },
  {
    type: 'rating',
    title: 'How would you rate the appointment scheduling process?',
    description: 'Rate from 1 (very difficult) to 5 (very easy)',
    required: false,
    minValue: 1,
    maxValue: 5,
    orderIndex: 12,
    isActive: true
  },
  {
    type: 'text',
    title: 'Any additional comments or concerns?',
    description: 'Please share any other feedback',
    required: false,
    placeholder: 'Additional comments...',
    validation: {
      maxLength: 1000
    },
    orderIndex: 13,
    isActive: true
  },
  {
    type: 'yesNo',
    title: 'Were you satisfied with the parking facilities?',
    description: 'Help us improve our parking services',
    required: false,
    orderIndex: 14,
    isActive: true
  },
  {
    type: 'rating',
    title: 'How would you rate the value for money?',
    description: 'Rate from 1 (poor value) to 5 (excellent value)',
    required: false,
    minValue: 1,
    maxValue: 5,
    orderIndex: 15,
    isActive: true
  },
  {
    type: 'multipleChoice',
    title: 'What time of day was your appointment?',
    description: 'This helps us understand peak times',
    required: false,
    options: ['Early Morning (6-9 AM)', 'Morning (9-12 PM)', 'Afternoon (12-3 PM)', 'Late Afternoon (3-6 PM)', 'Evening (6-9 PM)'],
    orderIndex: 16,
    isActive: true
  },
  {
    type: 'yesNo',
    title: 'Did you feel comfortable during your visit?',
    description: 'Your comfort is our priority',
    required: true,
    orderIndex: 17,
    isActive: true
  },
  {
    type: 'scale',
    title: 'How likely are you to return for future care?',
    description: 'Rate from 1 (very unlikely) to 10 (very likely)',
    required: true,
    minValue: 1,
    maxValue: 10,
    orderIndex: 18,
    isActive: true
  },
  {
    type: 'text',
    title: 'What could we have done differently today?',
    description: 'Help us identify areas for improvement',
    required: false,
    placeholder: 'Share your thoughts...',
    validation: {
      maxLength: 500
    },
    orderIndex: 19,
    isActive: true
  },
  {
    type: 'rating',
    title: 'How would you rate your doctor\'s communication?',
    description: 'Rate from 1 (very poor) to 5 (excellent)',
    required: true,
    minValue: 1,
    maxValue: 5,
    orderIndex: 20,
    isActive: true
  },
  {
    type: 'multipleChoice',
    title: 'How did you travel to our facility today?',
    description: 'This helps us plan better facilities',
    required: false,
    options: ['Personal Car', 'Public Transport', 'Taxi/Uber', 'Walking', 'Bicycle', 'Ambulance'],
    orderIndex: 21,
    isActive: true
  },
  {
    type: 'yesNo',
    title: 'Were you seen at your scheduled appointment time?',
    description: 'Punctuality is important to us',
    required: false,
    orderIndex: 22,
    isActive: true
  },
  {
    type: 'text',
    title: 'What impressed you most about our facility?',
    description: 'Share what made your experience special',
    required: false,
    placeholder: 'What impressed you...',
    validation: {
      maxLength: 300
    },
    orderIndex: 23,
    isActive: true
  },
  {
    type: 'rating',
    title: 'Overall, how satisfied are you with today\'s visit?',
    description: 'Your overall satisfaction rating (1 = very dissatisfied, 5 = very satisfied)',
    required: true,
    minValue: 1,
    maxValue: 5,
    orderIndex: 24,
    isActive: true
  }
];

// Sample Patients Data
const samplePatients = [
  {
    mobileNumber: '5551234567',
    name: 'John Smith',
    age: 35,
    gender: 'male',
    dateOfBirth: new Date('1988-05-15'),
    email: 'john.smith@email.com'
  },
  {
    mobileNumber: '5552345678',
    name: 'Sarah Johnson',
    age: 42,
    gender: 'female',
    dateOfBirth: new Date('1981-09-22'),
    email: 'sarah.johnson@email.com'
  },
  {
    mobileNumber: '5553456789',
    name: 'Michael Brown',
    age: 28,
    gender: 'male',
    dateOfBirth: new Date('1995-12-03'),
    email: 'michael.brown@email.com'
  },
  {
    mobileNumber: '5554567890',
    name: 'Emily Davis',
    age: 31,
    gender: 'female',
    dateOfBirth: new Date('1992-07-18'),
    email: 'emily.davis@email.com'
  },
  {
    mobileNumber: '5555678901',
    name: 'Robert Wilson',
    age: 55,
    gender: 'male',
    dateOfBirth: new Date('1968-03-10'),
    email: 'robert.wilson@email.com'
  }
];

// Sample Admin Users
const sampleAdminUsers = [
  {
    email: 'admin@hospital.com',
    name: 'System Administrator',
    role: 'admin',
    isActive: true
  },
  {
    email: 'manager@hospital.com',
    name: 'Feedback Manager',
    role: 'manager',
    isActive: true
  },
  {
    email: 'viewer@hospital.com',
    name: 'Report Viewer',
    role: 'viewer',
    isActive: true
  }
];

// Hospital Settings
const hospitalSettings = {
  hospitalName: 'PurpleHat Medical Center',
  primaryColor: '#8B5CF6',
  secondaryColor: '#1F2937',
  accentColor: '#10B981',
  welcomeMessage: 'Welcome to PurpleHat Medical Center! Your feedback helps us provide better care.',
  thankYouMessage: 'Thank you for taking the time to share your feedback. Your input is valuable to us!',
  contactInfo: 'For any questions, please contact us at (555) 123-4567 or info@purplehatmedical.com',
  theme: 'light',
  language: 'en',
  sessionTimeout: 10
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      Question.deleteMany({}),
      Patient.deleteMany({}),
      AdminUser.deleteMany({}),
      HospitalSettings.deleteMany({}),
      FeedbackSession.deleteMany({}),
      QuestionTemplate.deleteMany({}),
      ConsultationRules.deleteMany({})
    ]);
    console.log('✅ Existing data cleared');

    // Seed Questions
    console.log('📝 Seeding questions...');
    const questions = await Question.insertMany(sampleQuestions);
    console.log(`✅ Created ${questions.length} questions`);

    // Seed Patients
    console.log('👥 Seeding patients...');
    const patients = await Patient.insertMany(samplePatients);
    console.log(`✅ Created ${patients.length} patients`);

    // Seed Admin Users with hashed passwords
    console.log('👨‍💼 Seeding admin users...');
    const adminUsersWithPasswords = await Promise.all(
      sampleAdminUsers.map(async (user) => ({
        ...user,
        passwordHash: await bcrypt.hash('password123', 12)
      }))
    );
    const adminUsers = await AdminUser.insertMany(adminUsersWithPasswords);
    console.log(`✅ Created ${adminUsers.length} admin users`);

    // Seed Hospital Settings
    console.log('🏥 Seeding hospital settings...');
    const settings = await HospitalSettings.create(hospitalSettings);
    console.log('✅ Created hospital settings');

    // Create Question Templates
    console.log('📋 Creating question templates...');
    
    // First Visit Template
    const firstVisitTemplate = await QuestionTemplate.create({
      name: 'First Visit Feedback',
      description: 'Comprehensive feedback form for first-time patients',
      department: 'general',
      consultationType: 'first-visit',
      consultationNumberRange: { min: 1, max: 1 },
      isDefault: true,
      questions: sampleQuestions.slice(0, 12).map((q, index) => ({ ...q, orderIndex: index + 1 })),
      createdBy: adminUsers[0]._id
    });

    // Follow-up Template
    const followUpTemplate = await QuestionTemplate.create({
      name: 'Follow-up Visit Feedback',
      description: 'Focused feedback for follow-up appointments',
      department: 'general',
      consultationType: 'follow-up',
      consultationNumberRange: { min: 2, max: 5 },
      isDefault: true,
      questions: sampleQuestions.slice(0, 8).map((q, index) => ({ ...q, orderIndex: index + 1 })),
      createdBy: adminUsers[0]._id
    });

    // Regular Template
    const regularTemplate = await QuestionTemplate.create({
      name: 'Regular Visit Feedback',
      description: 'Standard feedback form for regular visits',
      department: 'general',
      consultationType: 'regular',
      consultationNumberRange: { min: 6 },
      isDefault: true,
      questions: sampleQuestions.slice(0, 6).map((q, index) => ({ ...q, orderIndex: index + 1 })),
      createdBy: adminUsers[0]._id
    });

    console.log('✅ Created question templates');

    // Create Consultation Rules
    console.log('📏 Creating consultation rules...');
    await ConsultationRules.create({
      department: 'general',
      rules: [
        {
          consultationNumber: 1,
          templateId: firstVisitTemplate._id,
          templateName: 'First Visit Feedback',
          description: 'Comprehensive feedback for new patients'
        },
        {
          consultationNumber: 2,
          templateId: followUpTemplate._id,
          templateName: 'Follow-up Visit Feedback',
          description: 'Follow-up focused feedback'
        },
        {
          consultationNumber: 3,
          templateId: followUpTemplate._id,
          templateName: 'Follow-up Visit Feedback',
          description: 'Follow-up focused feedback'
        }
      ],
      defaultTemplateId: regularTemplate._id,
      createdBy: adminUsers[0]._id
    });
    console.log('✅ Created consultation rules');

    // Create Sample Feedback Sessions
    console.log('💬 Creating sample feedback sessions...');
    const sampleFeedbackSessions = [];
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const numSessions = Math.floor(Math.random() * 3) + 1; // 1-3 sessions per patient
      
      for (let j = 0; j < numSessions; j++) {
        const consultationNumber = j + 1;
        const responses = questions.slice(0, 8).map(question => ({
          questionId: question._id,
          questionTitle: question.title,
          questionType: question.type,
          responseText: question.type === 'text' ? `Sample response for ${question.title}` : undefined,
          responseNumber: question.type === 'rating' || question.type === 'scale' ? Math.floor(Math.random() * (question.maxValue || 5)) + 1 : undefined,
          createdAt: new Date()
        }));
        
        sampleFeedbackSessions.push({
          patientId: patient._id,
          mobileNumber: patient.mobileNumber,
          consultationNumber,
          consultationDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          submittedAt: new Date(),
          isSynced: true,
          questionnaireType: consultationNumber === 1 ? 'first-visit' : consultationNumber <= 3 ? 'follow-up' : 'regular',
          responses
        });
      }
    }
    
    await FeedbackSession.insertMany(sampleFeedbackSessions);
    console.log(`✅ Created ${sampleFeedbackSessions.length} feedback sessions`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${questions.length} questions`);
    console.log(`   • ${patients.length} patients`);
    console.log(`   • ${adminUsers.length} admin users`);
    console.log(`   • 3 question templates`);
    console.log(`   • 1 consultation rule set`);
    console.log(`   • ${sampleFeedbackSessions.length} feedback sessions`);
    console.log(`   • 1 hospital settings configuration`);
    
    console.log('\n🔐 Admin Login Credentials:');
    console.log('   • admin@hospital.com / password123 (Admin)');
    console.log('   • manager@hospital.com / password123 (Manager)');
    console.log('   • viewer@hospital.com / password123 (Viewer)');
    
    console.log('\n📱 Test Patient Numbers:');
    samplePatients.forEach(patient => {
      console.log(`   • ${patient.mobileNumber} (${patient.name})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;