const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Job_Portal', {
    dbName: 'J'
}).then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    
    // Check if Certificate collection exists and has data
    const db = mongoose.connection.db;
    db.listCollections().toArray((err, collections) => {
        if (err) {
            console.error('❌ Error listing collections:', err);
            return;
        }
        
        console.log('📁 Available collections:');
        collections.forEach(collection => {
            console.log(`   - ${collection.name}`);
        });
        
        // Check certificates collection
        db.collection('certificates').countDocuments().then(count => {
            console.log(`📊 Certificates collection has ${count} documents`);
            
            // Get sample certificate if any exist
            if (count > 0) {
                db.collection('certificates').findOne().then(cert => {
                    console.log('📝 Sample certificate:', cert);
                });
            }
        });
        
        // Check users collection for authentication
        db.collection('users').countDocuments().then(count => {
            console.log(`👥 Users collection has ${count} documents`);
        });
    });
    
}).catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
});