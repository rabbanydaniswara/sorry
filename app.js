import React, { useState, useEffect } from 'react';
import { Heart, Clock, X, Lock, Loader2, WifiOff, Trash2 } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, deleteDoc, doc } from "firebase/firestore";

/* --- CONFIGURATION ---
  Replace these URLs with your actual photos!
*/
const PHOTO_GALLERY = [
  "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522609925277-66302040f57e?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621887234322-660e8f592185?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516589178581-a8078dbd638d?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=1000&auto=format&fit=crop",
];

// --- YOUR FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyA5wA9_Ign3ctmP9RHLF95Z3ovRndEfivc",
  authDomain: "only-a-test-2b894.firebaseapp.com",
  projectId: "only-a-test-2b894",
  storageBucket: "only-a-test-2b894.firebasestorage.app",
  messagingSenderId: "345905639102",
  appId: "1:345905639102:web:763ea6201026106ca538ef",
  measurementId: "G-BHRJ8TKHXR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// FIX: Only initialize Analytics on the client-side (Browser)
// This prevents Vercel Serverless Functions from crashing
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENTS ---

// 1. Celebration Confetti
const Confetti = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex justify-center">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute animate-fall"
        style={{
          left: `${Math.random() * 100}%`,
          top: `-10%`,
          backgroundColor: ['#FFC0CB', '#FF69B4', '#FF1493', '#FFB6C1'][Math.floor(Math.random() * 4)],
          width: '10px',
          height: '20px',
          animationDuration: `${Math.random() * 3 + 2}s`,
          animationDelay: `${Math.random() * 2}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }}
      />
    ))}
  </div>
);

// 2. Admin Panel (Hidden)
const AdminPanel = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const q = query(collection(db, 'apology_responses'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.warn("Could not fetch logs:", error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (e, id) => {
    // Stop the click from bubbling up or triggering other things
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this response?")) {
      try {
        await deleteDoc(doc(db, 'apology_responses', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Could not delete. Check your internet connection or database rules.");
      }
    }
  };

  return (
    // Increased z-index to 60 to be above confetti (which is z-50)
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Lock size={16} /> Response Log
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!user && (
             <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded mb-2 flex items-start gap-2">
               <WifiOff size={14} className="mt-0.5" />
               <div>
                 <strong>Offline Mode:</strong> Responses are not being saved to the database because Authentication is not enabled in the Firebase Console.
               </div>
             </div>
          )}
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : logs.length === 0 && user ? (
            <p className="text-center text-slate-500 py-4">No responses yet.</p>
          ) : !user ? (
             <p className="text-center text-slate-400 py-4 text-xs">Enable Anonymous Auth in Firebase Console to see logs.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`p-3 rounded-lg border group relative transition-all ${log.choice === 'forgive' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex justify-between items-start">
                  <span className={`font-bold ${log.choice === 'forgive' ? 'text-green-700' : 'text-amber-700'}`}>
                    {log.choice === 'forgive' ? 'Forgiven! 🎉' : 'Needs Time ⏳'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                        {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                    </span>
                    <button 
                        onClick={(e) => handleDelete(e, log.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all p-2"
                        title="Delete this entry"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                   {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Processing...'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// 3. Main App
export default function ApologyApp() {
  const [view, setView] = useState('initial'); // initial, forgive, time
  const [showAdmin, setShowAdmin] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.warn("Note: Firebase Auth failed. App running in offline mode. (Enable Anonymous Auth in console to fix)");
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleSecretClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      if (newCount === 3) {
        setShowAdmin(true);
        return 0;
      }
      return newCount;
    });
  };

  const handleResponse = async (choice) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Only try to save if we are successfully logged in
    if (user) {
        try {
            await addDoc(collection(db, 'apology_responses'), {
                choice: choice,
                timestamp: serverTimestamp(),
                device: navigator.userAgent,
                uid: user.uid
            });
        } catch (error) {
            console.error("Error recording response", error);
        }
    } else {
        console.log("User not logged in (Offline mode): Response not saved to DB, but UI will proceed.");
    }

    // UI Transition happens regardless of DB success/failure
    if (choice === 'forgive') {
      setView('forgive');
    } else {
      setView('time');
    }
    setIsSubmitting(false);
  };

  // --- RENDER: INITIAL STATE ---
  if (view === 'initial') {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 md:p-12 text-center border border-stone-100 transform transition-all hover:scale-[1.01] duration-500">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
            <Heart className="text-rose-400 fill-rose-400" size={32} />
          </div>

          <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-4">
            I'm so sorry.
          </h1>
          
          <p className="text-stone-500 leading-relaxed mb-10">
            I know I messed up, and I don't expect you to fix it immediately. 
            You mean the world to me, and I just wanted to ask...
          </p>

          <div className="space-y-3">
            <button 
              onClick={() => handleResponse('forgive')}
              disabled={isSubmitting}
              className="w-full group relative bg-stone-900 text-white py-4 rounded-xl font-medium shadow-lg shadow-stone-200 hover:bg-stone-800 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden"
            >
               {isSubmitting ? <Loader2 className="animate-spin" /> : (
                 <>
                   <span className="relative z-10">Yes, I forgive you</span>
                   <Heart size={16} className="group-hover:scale-125 transition-transform text-rose-300 fill-rose-300" />
                 </>
               )}
            </button>

            <button 
              onClick={() => handleResponse('time')}
              disabled={isSubmitting}
              className="w-full bg-white text-stone-500 py-4 rounded-xl font-medium border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Clock size={16} />
              <span>I still need time</span>
            </button>
          </div>
        </div>

        <footer className="mt-12 text-stone-300 text-sm flex items-center gap-1">
          Made with <Heart 
            size={12} 
            className={`fill-current cursor-pointer transition-colors duration-300 ${clickCount > 0 ? 'text-rose-400' : 'hover:text-stone-400'}`} 
            onClick={handleSecretClick} 
          /> for her
        </footer>
        
        <style>{`
          @keyframes pulse-slow {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s infinite ease-in-out;
          }
        `}</style>
      </div>
    );
  }

  // --- RENDER: NEEDS TIME STATE ---
  if (view === 'time') {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6">
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-amber-400" size={28} />
          </div>
          <h2 className="text-2xl font-serif text-stone-800 mb-3">I Understand completely.</h2>
          <p className="text-stone-500">
            Take all the space you need. I'll be here whenever you're ready to talk. 
            No pressure, just love.
          </p>
        </div>

         <footer className="absolute bottom-6 text-stone-300 text-sm flex items-center gap-1">
          <Heart size={12} className="fill-current cursor-pointer" onClick={handleSecretClick} />
        </footer>
      </div>
    );
  }

  // --- RENDER: FORGIVEN (GALLERY) STATE ---
  return (
    <div className="min-h-screen bg-white pb-20">
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      <Confetti />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100 px-6 py-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-rose-500 animate-bounce">
          <Heart className="fill-rose-500" size={20} />
          <span className="font-bold tracking-tight">Thank you, Love!</span>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="p-4 max-w-4xl mx-auto">
        <p className="text-center text-stone-400 text-sm mb-8 mt-4">
          Here are some of our best moments...
        </p>
        
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
          {PHOTO_GALLERY.map((src, index) => (
            <div key={index} className="break-inside-avoid rounded-xl overflow-hidden group relative shadow-sm hover:shadow-md transition-all duration-500">
              <img 
                src={src} 
                alt="Us" 
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                <Heart className="text-white fill-white/80" size={20} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button 
            onClick={() => window.location.reload()} 
            className="text-stone-400 text-sm hover:text-stone-600 underline decoration-stone-300 underline-offset-4"
          >
            Back to start
          </button>
        </div>
      </main>
      
      <footer className="mt-12 text-center text-stone-300 text-sm pb-6">
         <Heart size={12} className="inline fill-current cursor-pointer" onClick={handleSecretClick} />
      </footer>

       <style>{`
          @keyframes fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-fall {
            animation-timing-function: linear;
          }
        `}</style>
    </div>
  );
}