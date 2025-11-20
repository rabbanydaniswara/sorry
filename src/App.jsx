import React, { useState, useEffect, useRef } from 'react';
import { Heart, HeartCrack, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- CONFIGURATION ---
// 1. If running in this chat preview, we use the system config.
// 2. If you deploy to Vercel, REPLACE 'JSON.parse(__firebase_config)' below 
//    with your actual firebaseConfig object from the Firebase Console.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "YOUR_API_KEY_HERE",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT.firebasestorage.app",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Helper for App ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function ApologyApp() {
  // State for View and Logic
  const [view, setView] = useState('question'); // 'question' | 'waiting' | 'gallery'
  const [localImages, setLocalImages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  // --- SILENT STARTUP ---
  // We start the connection immediately when the app opens, 
  // but we don't block the UI or show a login screen.
  useEffect(() => {
    signInAnonymously(auth).catch((err) => {
      // We ignore errors here to keep the app "quiet". 
      // We will try to connect again when she clicks a button if needed.
      console.log("Background connection pending...");
    });
  }, []);

  // --- ROBUST SEND FUNCTION ---
  // This function ensures the message gets sent even if the app loaded slowly
  const saveAnswerToDatabase = async (answerText) => {
    setIsSending(true);
    try {
      // 1. Ensure we are connected before writing
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const credential = await signInAnonymously(auth);
        currentUser = credential.user;
      }

      // 2. Determine the collection path
      // If in the chat preview: Use strict path. 
      // If deployed: Use a simple 'responses' collection.
      let collectionRef;
      if (typeof __app_id !== 'undefined') {
         collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'apology_responses');
      } else {
         collectionRef = collection(db, 'responses');
      }

      // 3. Write the document
      await addDoc(collectionRef, {
        answer: answerText,
        timestamp: serverTimestamp(),
        userId: currentUser.uid
      });
      
      console.log("Answer saved:", answerText);

    } catch (error) {
      console.error("Could not save answer:", error);
      // Even if the database fails, we still let her see the next screen
      // so the "Apology" experience isn't ruined by tech issues.
    }
    setIsSending(false);
  };

  // --- BUTTON HANDLERS ---
  const handleForgive = async () => {
    await saveAnswerToDatabase('Yes, Forgiven');
    setView('gallery');
  };

  const handleTime = async () => {
    await saveAnswerToDatabase('Needs Time');
    setView('waiting');
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const newImages = files
      .filter(file => file.type.startsWith('image/'))
      .map(file => URL.createObjectURL(file));

    setLocalImages(prev => [...prev, ...newImages]);
  };

  // --- VIEW 1: THE APOLOGY ---
  if (view === 'question') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 to-pink-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background Animation */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
            <Heart className="absolute top-10 left-10 text-pink-400 w-12 h-12 animate-bounce duration-1000" />
            <Heart className="absolute bottom-20 right-20 text-red-300 w-16 h-16 animate-bounce duration-[3000ms]" />
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl max-w-md w-full z-10 text-center border border-white/50">
          <div className="flex justify-center mb-6">
            <HeartCrack className="w-20 h-20 text-rose-500 animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-3 font-serif">I'm sorry.</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
             I know I messed up. You mean the world to me.
          </p>

          <div className="space-y-3">
            {/* FORGIVE BUTTON */}
            <button 
              onClick={handleForgive}
              disabled={isSending}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              {isSending ? (
                <span className="animate-pulse">Sending...</span>
              ) : (
                <>
                  <Heart className="w-5 h-5 fill-current" />
                  <span>Yes, I Forgive You</span>
                </>
              )}
            </button>

            {/* TIME BUTTON */}
            <button 
              onClick={handleTime}
              disabled={isSending}
              className="w-full bg-white hover:bg-gray-50 text-gray-600 font-semibold py-4 px-6 rounded-xl shadow border border-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
               {isSending ? (
                <span className="animate-pulse">Sending...</span>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  <span>I Still Need Time</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: NEEDS TIME ---
  if (view === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 animate-fade-in">
          <Clock className="w-16 h-16 text-slate-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">I Understand.</h2>
          <p className="text-slate-600">
            Take all the time you need. I'll be here waiting.
          </p>
        </div>
      </div>
    );
  }

  // --- VIEW 3: GALLERY (SUCCESS) ---
  return (
    <div className="min-h-screen bg-stone-50 animate-fade-in">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-stone-100 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <span className="font-serif text-xl font-bold text-stone-800">Our Memories</span>
          </div>
          
          <div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFiles}
              multiple 
              webkitdirectory="true" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Select Photo Folder
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-serif text-stone-800 mb-3">Thank you.</h2>
          <p className="text-stone-500">Here is why I love you.</p>
        </div>

        {/* Gallery Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
          {/* User Uploaded Images */}
          {localImages.map((src, index) => (
            <div key={`local-${index}`} className="break-inside-avoid rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
              <img src={src} alt="Memory" className="w-full h-auto object-cover" />
            </div>
          ))}

          {/* Default Placeholders (Only shown if no folder is loaded yet) */}
          {localImages.length === 0 && (
             <>
                <Placeholder src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop" />
             </>
          )}
        </div>

        {localImages.length === 0 && (
            <div className="mt-12 text-center p-10 bg-white rounded-2xl border border-dashed border-stone-300">
                <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">No folder selected.</p>
                <p className="text-stone-400 text-sm">Click the button in the top right to view your photos.</p>
            </div>
        )}
      </main>
    </div>
  );
}

function Placeholder({ src }) {
    return (
        <div className="break-inside-avoid rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all mb-4">
            <img src={src} alt="Placeholder" className="w-full h-auto object-cover" />
        </div>
    )
}