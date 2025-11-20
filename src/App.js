import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Sparkles, Frown, Lock, Loader2, CheckCircle, Clock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- 1. PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
  // PASTE YOUR KEYS FROM FIREBASE CONSOLE HERE
  // It should look like this:
  // apiKey: "AIzaSyD...",
  // authDomain: "your-project.firebaseapp.com",
  // projectId: "your-project",
  // storageBucket: "your-project.appspot.com",
  // messagingSenderId: "...",
  // appId: "..."
};

// --- 2. CONTENT CONFIGURATION ---
const CONFIG = {
  herName: "Sarah", 
  yourName: "Alex", 
  apologyTitle: "I messed up, and I am sorry.",
  apologyText: `
    I've been doing a lot of thinking, and I realized how wrong I was. 
    I never wanted to hurt you or make you feel unappreciated. 
    You mean the world to me, and seeing you upset breaks my heart.
    
    Please let me make it up to you. I promise to listen better and be the person you deserve.
  `,
  photos: [
    { url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=800&auto=format&fit=crop", caption: "Remember this day?" },
    { url: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=800&auto=format&fit=crop", caption: "My favorite smile." },
    { url: "https://images.unsplash.com/photo-1516589171835-59d917b58097?q=80&w=800&auto=format&fit=crop", caption: "We make a great team." },
  ]
};

// --- 3. APP LOGIC ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// We use a fixed path for your personal deployment
const COLLECTION_PATH = "apology_data"; 
const DOC_ID = "her_response";

export default function App() {
  const [viewMode, setViewMode] = useState('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin') {
      setViewMode('admin');
    } else {
      setViewMode('her');
    }
  }, []);

  if (viewMode === 'loading') return null;
  return viewMode === 'admin' ? <AdminPage /> : <HerPage />;
}

function HerPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [localResponse, setLocalResponse] = useState(null);
  const [hearts, setHearts] = useState([]);
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedStatus, setHasLoadedStatus] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, COLLECTION_PATH, DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists() && snapshot.data().choice) {
        setLocalResponse(snapshot.data().choice);
      }
      setHasLoadedStatus(true);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (localResponse === 'yes') {
      const interval = setInterval(() => {
        const newHeart = {
          id: Math.random(),
          left: Math.random() * 100,
          animationDuration: 2 + Math.random() * 3,
          size: 20 + Math.random() * 30
        };
        setHearts(prev => [...prev, newHeart]);
        setTimeout(() => {
          setHearts(prev => prev.filter(h => h.id !== newHeart.id));
        }, 5000);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [localResponse]);

  const saveChoice = async (choice) => {
    if (localResponse !== null) return;
    setLocalResponse(choice);
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, COLLECTION_PATH, DOC_ID), {
        choice: choice,
        timestamp: serverTimestamp(),
        viewerName: CONFIG.herName 
      });
    } catch (err) {
      console.error("Failed to save response:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <Heart key={i} className="absolute text-rose-300" style={{top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, transform: `scale(${0.5+Math.random()}) rotate(${Math.random()*360}deg)`}} />
          ))}
        </div>
        <button onClick={() => setIsOpen(true)} className="group relative bg-white p-8 md:p-12 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 border-2 border-rose-100 max-w-md w-full text-center z-10">
          <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <MessageCircle className="text-rose-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif text-gray-800 mb-2">For {CONFIG.herName}</h1>
          <p className="text-gray-500 text-sm uppercase tracking-widest">A message for you</p>
          <div className="mt-8 text-rose-400 text-xs animate-pulse">Tap to open</div>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f5] text-gray-800 font-sans selection:bg-rose-200 pb-12">
      {localResponse === 'yes' && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {hearts.map(heart => (
            <div key={heart.id} className="absolute text-rose-500" style={{left: `${heart.left}%`, bottom: '-50px', fontSize: `${heart.size}px`, animation: `floatUp ${heart.animationDuration}s linear forwards`}}>❤️</div>
          ))}
        </div>
      )}
      <div className="h-64 md:h-80 bg-rose-900 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/30 z-10" />
        <img src="https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=1200&auto=format&fit=crop" alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-60"/>
        <div className="relative z-20 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 tracking-tight">I'm Sorry.</h1>
          <p className="text-rose-100 text-lg md:text-xl font-light">Please hear me out.</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12 -mt-10 relative z-30">
        <div className="bg-white rounded-xl shadow-xl p-8 md:p-12 border border-gray-100 mb-12">
          <div className="flex justify-center mb-6"><Heart className="text-rose-500 w-8 h-8 fill-current" /></div>
          <h2 className="text-2xl font-serif text-gray-900 mb-6 text-center">{CONFIG.apologyTitle}</h2>
          <div className="prose prose-rose mx-auto text-gray-600 leading-relaxed whitespace-pre-line text-lg">{CONFIG.apologyText}</div>
          <p className="text-right mt-8 font-serif text-xl italic text-gray-800">— {CONFIG.yourName}</p>
        </div>
        <div className="mb-16">
          <div className="flex items-center justify-center gap-2 mb-8"><Sparkles className="w-5 h-5 text-rose-400" /><h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Us at our best</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONFIG.photos.map((photo, idx) => (
              <div key={idx} className={`group relative overflow-hidden rounded-2xl shadow-md aspect-[4/3] ${idx === 2 ? 'md:col-span-2 md:aspect-[2/1]' : ''}`}>
                <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6"><p className="text-white font-medium">{photo.caption}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center py-8">
          {!hasLoadedStatus ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div> : localResponse === null ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h3 className="text-2xl font-serif text-gray-800">Will you forgive me?</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => saveChoice('yes')} disabled={isSaving} className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-medium shadow-lg hover:shadow-rose-200 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isSaving && <Loader2 className="animate-spin w-4 h-4" />}<span>Yes, I forgive you</span></button>
                <button onClick={() => saveChoice('no')} disabled={isSaving} className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">I need more time</button>
              </div>
            </div>
          ) : localResponse === 'yes' ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-8 animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Heart className="w-8 h-8 text-green-600 fill-current" /></div>
              <h3 className="text-2xl font-serif text-green-800 mb-2">Thank you, {CONFIG.herName}!</h3>
              <p className="text-green-600">I won't let you down. Let's go get dinner soon?</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 animate-in zoom-in duration-500">
               <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"><Frown className="w-8 h-8 text-gray-500" /></div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">I understand.</h3>
              <p className="text-gray-600">I know trust takes time to rebuild. I'm here whenever you're ready.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes floatUp { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; } }`}</style>
    </div>
  );
}

function AdminPage() {
  const [user, setUser] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, COLLECTION_PATH, DOC_ID);
        const unsubscribeDb = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) { setDbStatus(snapshot.data()); } else { setDbStatus(null); }
          setLoading(false);
        });
        return () => unsubscribeDb();
      }
    });
  }, []);

  const statusColor = !dbStatus ? 'bg-gray-100 text-gray-500' : dbStatus.choice === 'yes' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
  const statusIcon = !dbStatus ? <Clock className="w-6 h-6" /> : dbStatus.choice === 'yes' ? <CheckCircle className="w-6 h-6" /> : <Lock className="w-6 h-6" />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-8 text-gray-400"><Lock className="w-4 h-4" /><span className="text-xs font-bold tracking-widest uppercase">Private Dashboard</span></div>
        <h1 className="text-2xl font-bold mb-6">Apology Status</h1>
        <div className={`p-8 rounded-2xl border ${statusColor} transition-colors duration-500 mb-6 flex flex-col items-center text-center gap-4 shadow-sm`}>
          <div className="p-4 bg-white/50 rounded-full">{statusIcon}</div>
          <div>
            <h2 className="text-xl font-bold mb-1">{!dbStatus ? "Waiting for response..." : dbStatus.choice === 'yes' ? "She forgave you!" : "She needs more time"}</h2>
            <p className="opacity-80 text-sm">{!dbStatus ? "Check back later." : "Response recorded."}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Raw Data</h3>
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : dbStatus ? <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto">{JSON.stringify(dbStatus, null, 2)}</pre> : <div className="text-sm text-gray-400 italic">No data found.</div>}
        </div>
      </div>
    </div>
  );
}