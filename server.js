const Hapi = require('@hapi/hapi');
const admin = require('firebase-admin');
const Inert = require('@hapi/inert');
const jwt = require('jsonwebtoken');
const {getAuth, signInWithEmailAndPassword} = require('firebase/auth');
const firebase = require('firebase/app');


// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBemq1Wh5rnzQ-9gjgONlOsvzfqtjJC6JQ",
  authDomain: "first-inquiry-381608.firebaseapp.com",
  projectId: "first-inquiry-381608",
  storageBucket: "first-inquiry-381608.appspot.com",
  messagingSenderId: "502743589658",
  appId: "1:502743589658:web:c1b7c214c9b9311f29c2a3"
};

const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase Admin SDK
const serviceAccount = require('./first-inquiry-381608-firebase-adminsdk-tinai-bfc6566bcb.json'); // Path to your service account key JSON file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Hapi server
const server = Hapi.server({
  port: 8080,
  host: '0.0.0.0'
});

const init = async () => {
  await server.register(Inert); // Register the inert plugin for payload parsing

  // Email validation regular expression
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Define route for user registration
  server.route({
    method: 'POST',
    path: '/register',
    handler: async (request, h) => {
      const { name, email, password } = request.payload; // Destructure email and password from the parsed payload

      // Check if email is invalid
      if (!emailRegex.test(email)) {
        return h.response('Invalid email address').code(400);
      }

      // Check if password length is less than 6 characters
      if (password.length < 8) {
        return h.response('Password must be at least 8 characters').code(400);
      }

      try {
        // Create user account using Firebase Authentication
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: name // Set the display name as the user's name
        });
  
        // Create a document in the "users" collection
        const db = admin.firestore();
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          name: name,
          email: email,
          favorite: []
        });

        return {
          message: 'User registered successfully',
          userId: userRecord.uid
        };
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          return h.response('Email already registered').code(409);
        }

        console.error('Error creating user:', error);
        return h.response('Internal Server Error').code(500);
      }
    }
  });

  // Define route for user login
  server.route({
    method: 'POST',
    path: '/login',
    handler: async (request, reply) => {
      const auth = getAuth();
      // Get the email and password from the request body
      const { email, password } = request.payload;
      
      // Try to login the user
      try {
        const user = await signInWithEmailAndPassword(auth, email, password);
        
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;
        const token = await admin.auth().createCustomToken(uid);
    
        // If the login was successful, return the user's ID token
        return {
            error: false,
            message: "success",
            userId:user.user.uid,
            name:user.user.displayName,
            idToken: token,
        };
      } catch (error) {
        // If the login failed, return an error message
        return {
          error: error.message,
        };
      }
    },
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
    path: '/get-user-id',
    handler: async (request, h) => {
      const authHeader = request.headers.authorization;
      const [scheme, token] = authHeader.split(' ');
      


      if (scheme !== 'Bearer') {
        // The request is not authenticated
        return;
      }
  
      const decodedToken = jwt.decode(token);
      const userId = decodedToken.uid;
  
      return {
        userId: userId,
      };
    },
  });

  server.route({
    method: 'POST',
    path: '/add-favorite',
    handler: async (request, h) => {
      const { perfumeId } = request.payload;
  
      const authHeader = request.headers.authorization;
      const [scheme, token] = authHeader.split(' ');
  
      if (scheme !== 'Bearer') {
        // The request is not authenticated
        return;
      }
  
      const decodedToken = jwt.decode(token);
      const userId = decodedToken?.uid;
  
      if (!userId) {
        // The decoded user ID is null or undefined
        return h.response('User ID not found').code(404);
      }
  
      try {
        // Get a Firestore reference
        const db = admin.firestore();
  
        // Check if the user exists
        const userDoc = await db.collection('users').doc(userId).get();
  
        if (!userDoc.exists) {
          // The user does not exist
          return h.response('User ID not found').code(404);
        }
  
        const user = userDoc.data();
  
        // Update the user document with the new favorite perfume
        await db.collection('users').doc(userId).update({
          favorite: admin.firestore.FieldValue.arrayUnion(perfumeId)
        });
  
        return {
          message: 'Perfume added to favorites successfully'
        };
      } catch (error) {
        console.error('Error adding perfume to favorites:', error);
        return h.response('Internal server error').code(500);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/favorites',
    handler: async (request, h) => {
      const authHeader = request.headers.authorization;
      const [scheme, token] = authHeader.split(' ');
  
      if (scheme !== 'Bearer') {
        // The request is not authenticated
        return;
      }
  
      const decodedToken = jwt.decode(token);
      const userId = decodedToken.uid;
  
      try {
        // Get a Firestore reference
        const db = admin.firestore();
  
        // Check if the user exists
        const user = await db.collection('users').doc(userId).get();
  
        if (!user.exists) {
          // The user does not exist
          return h.response('User ID not found').code(404);
        }
  
        // Get the favorite perfumes from the user document
        const favoritePerfumes = user.data().favorite;
  
        // Return the favorite perfumes to the client
        return h.response(favoritePerfumes);
      } catch (error) {
        console.error('Error retrieving favorites:', error);
        return h.response('Internal server error').code(500);
      }
    }
  });


  server.route({
    method: 'GET',
    path: '/notes',
    handler: async (request, h) => {
      try {
        const db = admin.firestore();
        // Query the Firestore collection
        const querySnapshot = await db.collection('perfumes').get();
  
        // Check if any documents exist
        if (querySnapshot.empty) {
          return h.response('No documents found').code(404);
        }
  
        const notesSet = new Set();
  
        // Iterate over each document
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Extract notes from the specified fields and add them to the set
          addNotesToSet(notesSet, data.base_notes1);
          addNotesToSet(notesSet, data.base_notes2);
          addNotesToSet(notesSet, data.base_notes3);
          addNotesToSet(notesSet, data.mid_notes1);
          addNotesToSet(notesSet, data.mid_notes2);
          addNotesToSet(notesSet, data.mid_notes3);
          addNotesToSet(notesSet, data.top_notes1);
          addNotesToSet(notesSet, data.top_notes2);
          addNotesToSet(notesSet, data.top_notes3);
        });
  
        // Convert the set to an array and return the response
        const uniqueNotes = Array.from(notesSet);
        return h.response(uniqueNotes);
      } catch (error) {
        console.error('Error retrieving notes:', error);
        return h.response('Internal server error').code(500);
      }
    }
  });
  
  // Helper function to add notes to the set
  function addNotesToSet(notesSet, notes) {
    if (Array.isArray(notes)) {
      notes.forEach((note) => {
        if (note) {
          notesSet.add(note);
        }
      });
    } else if (notes) {
      notesSet.add(notes);
    }
  }
  

  server.route({
    method: 'GET',
    path: '/perfume/brand/{brand}',
    handler: async (request, h) => {
      try {
        const brand = request.params.brand;

        const db = admin.firestore();
  
        // Query the Firestore collection based on "brand" field
        const querySnapshot = await db
          .collection('perfumes')
          .where('brand', '==', brand)
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
        console.error('Error retrieving documents:', error);
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

  server.route({
    method: 'POST',
    path: '/remove-favorite',
    handler: async (request, h) => {
      const { perfumeId } = request.payload;
  
      const authHeader = request.headers.authorization;
      const [scheme, token] = authHeader.split(' ');
  
      if (scheme !== 'Bearer') {
        // The request is not authenticated
        return;
      }
  
      const decodedToken = jwt.decode(token);
      const userId = decodedToken?.uid;
  
      if (!userId) {
        // The decoded user ID is null or undefined
        return h.response('User ID not found').code(404);
      }
  
      try {
        // Get a Firestore reference
        const db = admin.firestore();
  
        // Check if the user exists
        const userDoc = await db.collection('users').doc(userId).get();
  
        if (!userDoc.exists) {
          // The user does not exist
          return h.response('User ID not found').code(404);
        }
  
        // Update the user document by removing the favorite perfume
        await db.collection('users').doc(userId).update({
          favorite: admin.firestore.FieldValue.arrayRemove(perfumeId)
        });
  
        return {
          message: 'Perfume removed from favorites successfully'
        };
      } catch (error) {
        console.error('Error removing perfume from favorites:', error);
        return h.response('Internal server error').code(500);
      }
    }
  });
  

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

init();
