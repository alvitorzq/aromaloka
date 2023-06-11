const Hapi = require('hapi');
const admin = require('firebase-admin');

// const firebaseConfig = {
//     apiKey: "AIzaSyBemq1Wh5rnzQ-9gjgONlOsvzfqtjJC6JQ",
//     authDomain: "first-inquiry-381608.firebaseapp.com",
//     projectId: "first-inquiry-381608",
//     storageBucket: "first-inquiry-381608.appspot.com",
//     messagingSenderId: "502743589658",
//     appId: "1:502743589658:web:c1b7c214c9b9311f29c2a3"
//   };
  
//   // Initialize Firebas
//   const app = initializeApp(firebaseConfig);
  

// Initialize Firebase Admin SDK
const serviceAccount = require('../first-inquiry-381608-firebase-adminsdk-tinai-bfc6566bcb.json'); // Path to your service account key JSON file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Hapi server
const server = Hapi.server({
  port: 3000,
  host: 'localhost'
});

// Define route to retrieve data from Firebase
// Define route to retrieve data based on "variant" field from Firestore
server.route({
    method: 'GET',
    path: '/perfume/{variant}',
    handler: async (request, h) => {
      try {
        const variant = request.params.variant;
  
        // Get a Firestore reference
        const db = admin.firestore();
  
        // Query the "perfume" collection based on "variant" field
        const querySnapshot = await db
          .collection('perfumes')
          .where('variant', '==', variant)
          .get();
  
        // Check if any documents match the query
        if (querySnapshot.empty) {
          return h.response('No documents found').code(404);
        }
  
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push(doc.data());
        });
  
        return h.response(data);
      } catch (error) {
        console.error('Error retrieving data:', error);
        return h.response('Internal server error').code(500);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/perfumes/',
    handler: async (request, h) => {
      try {
        // Get a Firestore reference
        const db = admin.firestore();
  
        // Get all documents from the "perfume" collection
        const querySnapshot = await db.collection('perfumes').get();
  
        // Check if any documents exist
        if (querySnapshot.empty) {
          return h.response('No documents found').code(404);
        }
  
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push(doc.data());
        });
  
        return h.response(data);
      } catch (error) {
        console.error('Error retrieving data:', error);
        return h.response('Internal server error').code(500);
      }
    }
  });

// Start the server
async function start() {
  try {
    await server.start();
    console.log('Server running at:', server.info.uri);
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

start();
