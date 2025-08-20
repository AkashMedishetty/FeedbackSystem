const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function createAdminUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const adminUsers = db.collection('adminUsers');
    
    // Check if admin user already exists
    const existingAdmin = await adminUsers.findOne({ email: 'admin@hospital.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    const adminUser = {
      email: 'admin@hospital.com',
      passwordHash,
      name: 'System Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await adminUsers.insertOne(adminUser);
    console.log('Admin user created successfully:', result.insertedId);
    console.log('Login credentials:');
    console.log('Email: admin@hospital.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login!');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

createAdminUser();