import React, { useState, useEffect, useRef } from 'react';
import { Heart, HeartCrack, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
// Using the environment configuration ensures compatibility with the provided auth token
const firebaseConfig = JSON.parse(__firebase_config);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Helper for App ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function ApologyApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('question'); // 'question', 'gallery', 'waiting'
  const [localImages, setLocalImages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  // --- ROBUST ANONYMOUS AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Try Custom Token (if provided by environment)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // 2. Default to Anonymous
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.warn("Initial auth failed, forcing anonymous fallback...", error);
        // 3. Safety Fallback: Ensure anonymous auth happens if custom token fails
        try {
          await signInAnonymously(auth);
        } catch (anonError) {
          console.error("CRITICAL: Anonymous auth failed", anonError);
        }
      }
    };
    
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- SAVE RESPONSE TO DATABASE ---
  const sendResponse = async (answer) => {
    if (!user) return;

    try {
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'apology_responses');
      await addDoc(collectionRef, {
        answer: answer,
        timestamp: serverTimestamp(),
        userId: user.uid // Anonymous User ID
      });
    } catch (e) {
      console.error("Error saving response: ", e);
      alert("Connection error. Please try again."); // Simple fallback feedback
    }
  };

  // --- EVENT HANDLERS ---
  const handleForgive = async () => {
    setIsSending(true);
    await sendResponse('Yes, Forgiven');
    setIsSending(false);
    setView('gallery');
  };

  const handleTime = async () => {
    setIsSending(true);
    await sendResponse('Needs Time');
    setIsSending(false);
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

  // --- VIEW 1: THE QUESTION ---
  if (view === 'question') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 to-pink-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Hearts */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
            <Heart className="absolute top-10 left-10 text-pink-400 w-12 h-12 animate-bounce" style={{animationDuration: '3s'}} />
            <Heart className="absolute bottom-20 right-20 text-red-300 w-16 h-16 animate-bounce" style={{animationDuration: '4s'}} />
            <Heart className="absolute top-1/3 right-10 text-rose-400 w-8 h-8 animate-pulse" />
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
            <button 
              onClick={handleForgive}
              disabled={!user || isSending}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
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

            <button 
              onClick={handleTime}
              disabled={!user || isSending}
              className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-600 font-semibold py-4 px-6 rounded-xl shadow border border-gray-200 transition-all flex items-center justify-center gap-3"
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

  // --- VIEW 2: WAITING ---
  if (view === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
          <Clock className="w-16 h-16 text-slate-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">I Understand.</h2>
          <p className="text-slate-600">
            Take all the time you need. I'll be here waiting.
          </p>
        </div>
      </div>
    );
  }

  // --- VIEW 3: GALLERY (FORGIVEN) ---
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Simple Header */}
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
              className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
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

        {/* Images Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
          {/* Uploaded Images */}
          {localImages.map((src, index) => (
            <div key={`local-${index}`} className="break-inside-avoid rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
              <img src={src} alt="Memory" className="w-full h-auto object-cover" />
            </div>
          ))}

          {/* Placeholders (Only if no uploads yet) */}
          {localImages.length === 0 && (
             <>
                <Placeholder src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1474552226712-ac0f0961a954?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=800&auto=format&fit=crop" />
                <Placeholder src="https://images.unsplash.com/photo-1511285560982-1356c11d4606?q=80&w=800&auto=format&fit=crop" />
             </>
          )}
        </div>

        {localImages.length === 0 && (
            <div className="mt-12 text-center p-10 bg-white rounded-2xl border border-dashed border-stone-300">
                <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">No folder selected yet.</p>
                <p className="text-stone-400 text-sm">Click the button in the top right to view your memories.</p>
            </div>
        )}
      </main>
    </div>
  );
}

// Simple Helper Component for cleaner code
function Placeholder({ src }) {
    return (
        <div className="break-inside-avoid rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all mb-4">
            <img src={src} alt="Placeholder" className="w-full h-auto object-cover" />
        </div>
    )
}