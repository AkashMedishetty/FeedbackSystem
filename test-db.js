const { MongoClient } = require('mongodb');

async function testDatabase() {
  const uri = xx
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('patient-feedback-dev');
    
    // Check consultation rules
    const consultationRules = await db.collection('consultationrules').find({}).toArray();
    console.log('Consultation Rules:', JSON.stringify(consultationRules, null, 2));
    
    // Check question templates
    const templates = await db.collection('questiontemplates').find({}).toArray();
    console.log('Question Templates:', templates.length, 'found');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testDatabase();
