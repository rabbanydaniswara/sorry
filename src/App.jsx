import React, { useState, useEffect, useRef } from 'react';
import { Heart, HeartCrack, Clock, Lock, Check, RefreshCw, Image as ImageIcon, Send, MessageSquare, Trash2 } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

// --- CONFIGURATION ---
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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Global App ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function ApologyApp() {
  const [view, setView] = useState('question'); // 'question' | 'waiting' | 'gallery' | 'admin'
  const [isSending, setIsSending] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [adminData, setAdminData] = useState([]);
  
  // New state for the reason text field
  const [reasonText, setReasonText] = useState('');
  const [reasonSent, setReasonSent] = useState(false);

  // --- AUTHENTICATION ---
  useEffect(() => {
    const startAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) { console.error("Auth pending...", e); }
      }
    };
    startAuth();
  }, []);

  // --- SECRET ADMIN ACCESS ---
  const handleSecretClick = () => {
    const newCount = adminClickCount + 1;
    setAdminClickCount(newCount);
    if (newCount === 5) {
      fetchAdminData();
      setView('admin');
      setAdminClickCount(0);
    }
  };

  // --- ADMIN: FETCH RESPONSES ---
  const fetchAdminData = async () => {
    try {
      let q;
      if (typeof __app_id !== 'undefined') {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'apology_responses');
        q = query(colRef); 
      } else {
        const colRef = collection(db, 'responses');
        q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setAdminData(data);
    } catch (error) {
      console.error("Admin fetch error:", error);
      alert("Could not fetch data. Check console.");
    }
  };

  // --- ADMIN: DELETE RESPONSE ---
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this response?")) return;

    try {
      const pathParts = typeof __app_id !== 'undefined' 
        ? ['artifacts', appId, 'public', 'data', 'apology_responses', id] 
        : ['responses', id];
      
      await deleteDoc(doc(db, ...pathParts));
      
      // Update UI locally without re-fetching
      setAdminData(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete. Check console.");
    }
  };

  // --- DATABASE SAVE ---
  const saveAnswer = async (answer) => {
    setIsSending(true);
    try {
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }

      const pathParts = typeof __app_id !== 'undefined' 
        ? ['artifacts', appId, 'public', 'data', 'apology_responses'] 
        : ['responses'];

      const colRef = collection(db, ...pathParts);
      
      await addDoc(colRef, {
        answer,
        timestamp: serverTimestamp(),
        userId: user.uid
      });
      return true;
    } catch (error) {
      console.error("Save error:", error);
      alert("Connection failed. Please try again.");
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // --- HANDLERS ---
  const onForgive = async () => {
    const success = await saveAnswer('Yes, Forgiven');
    if (success) setView('gallery');
  };

  const onTime = async () => {
    const success = await saveAnswer('Needs Time');
    if (success) setView('waiting');
  };

  const handleReasonSubmit = async () => {
    if (!reasonText.trim()) return;
    const success = await saveAnswer(`Reason: ${reasonText}`);
    if (success) {
      setReasonSent(true);
      setReasonText('');
    }
  };

  // --- VIEWS ---

  // 1. ADMIN DASHBOARD
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 p-6 font-sans">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-slate-800 p-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5" /> Admin Dashboard
            </h2>
            <button onClick={() => setView('question')} className="text-slate-300 hover:text-white text-sm">
              Exit Admin
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">Recent Responses</h3>
              <button onClick={fetchAdminData} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {adminData.length === 0 ? (
              <p className="text-gray-400 italic text-center py-8">No responses yet.</p>
            ) : (
              <div className="space-y-3">
                {adminData.map((item) => {
                  const isReason = item.answer.startsWith('Reason:');
                  const isYes = item.answer.includes('Yes');
                  
                  return (
                    <div key={item.id} className={`p-4 rounded-lg border flex justify-between items-center group ${
                      isReason ? 'bg-blue-50 border-blue-200' :
                      isYes ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex-grow">
                        <span className={`font-bold ${
                          isReason ? 'text-blue-700' :
                          isYes ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          {item.answer}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          User ID: {item.userId?.slice(0, 6)}...
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400">
                          {item.timestamp?.seconds 
                            ? new Date(item.timestamp.seconds * 1000).toLocaleString() 
                            : 'Just now'}
                        </span>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-300 hover:text-red-600 hover:bg-red-100 rounded-full transition-all opacity-50 group-hover:opacity-100"
                          title="Delete Response"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. WAITING SCREEN
  if (view === 'waiting') {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full border border-stone-200">
          <Clock className="w-20 h-20 text-stone-400 mx-auto mb-6" />
          <h2 className="text-3xl font-serif font-bold text-stone-800 mb-4">Baiklah, aku mengerti</h2>
          <p className="text-stone-600 leading-relaxed">
            Aku bakal nunggu kamu selama yang kamu butuhin. Makasih ya udah ngasih tau. Aku harap kita bisa ngobrol lagi nanti, kapan pun kamu siap.
          </p>
        </div>
      </div>
    );
  }

  // 3. POLAROID GALLERY (FORGIVEN)
  if (view === 'gallery') {
    const polaroids = [
      { src: "upload/5.png", caption: "Forever us", rotate: "rotate-2" },
      { src: "upload/9.png", caption: "Adventures", rotate: "-rotate-1" },
      { src: "upload/4.jpg", caption: "My favorite day", rotate: "rotate-3" },
      { src: "./upload/3.jpg", caption: "Smile :)", rotate: "-rotate-2" },
      { src: "./upload/1.jpg", caption: "Love you", rotate: "rotate-1" },
      { src: "./upload/6.png", caption: "Always", rotate: "-rotate-3" },
      // Duplicated to show "spread out" effect more
      { src: "./upload/7.png", caption: "Sunshine", rotate: "rotate-2" },
      { src: "./upload/2.jpg", caption: "Memories", rotate: "-rotate-2" },
    ];

    return (
      <div className="min-h-screen bg-[#f0e6d2] relative overflow-x-hidden" style={{backgroundImage: 'radial-gradient(#daccb6 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        
        {/* Header */}
        <div className="py-12 text-center">
          <h1 className="font-serif text-5xl text-stone-800 font-bold mb-3">Our Memories</h1>
          <p className="text-stone-600 italic text-lg">Terima kasih sudah mau memaafkan aku ❤️</p>
        </div>

        {/* Scattered Grid - WIDE SPREAD */}
        <div className="w-full px-4 md:px-12 pb-32 flex flex-wrap justify-evenly content-start gap-16 md:gap-24">
          {polaroids.map((photo, index) => (
            <div 
              key={index} 
              className={`
                relative bg-white p-4 pb-16 shadow-2xl transition-all duration-500 hover:z-50 hover:scale-110 hover:rotate-0 cursor-pointer
                ${photo.rotate}
                w-72 md:w-80
              `}
              style={{
                boxShadow: '10px 10px 20px rgba(0,0,0,0.15)'
              }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/40 backdrop-blur-sm rotate-[-2deg] shadow-sm z-10" style={{border: '1px solid rgba(255,255,255,0.3)'}}></div>
              <div className="aspect-[4/5] w-full bg-stone-100 overflow-hidden mb-4 filter sepia-[0.2] hover:sepia-0 transition-all duration-500">
                <img src={photo.src} alt={photo.caption} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-4 left-0 w-full text-center">
                <p className="font-serif text-stone-700 text-xl opacity-90" style={{fontFamily: '"Caveat", "Courier New", cursive'}}>
                  {photo.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* REASON INPUT SECTION */}
        <div className="max-w-xl mx-auto mb-32 px-6">
           <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50 text-center">
              <MessageSquare className="w-8 h-8 text-stone-400 mx-auto mb-4" />
              
              {!reasonSent ? (
                <>
                  <h3 className="text-xl font-bold text-stone-700 mb-4 font-serif">Oh ya, satu lagi...</h3>
                  <div className="flex flex-col gap-3">
                    <textarea 
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder="Kenapa kamu mau maafin aku?"
                      className="w-full p-4 rounded-xl border border-stone-200 bg-white/80 focus:ring-2 focus:ring-rose-200 focus:outline-none resize-none h-32 text-stone-700 placeholder:text-stone-400"
                    />
                    <button 
                      onClick={handleReasonSubmit}
                      disabled={isSending || !reasonText.trim()}
                      className="bg-stone-800 hover:bg-black disabled:bg-stone-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isSending ? 'Mengirim...' : (
                        <>
                          <span>Kirim</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 animate-fade-in">
                   <Heart className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
                   <p className="text-xl font-serif text-stone-800">Aku bakalan ngasih yang terbaik, Terima kasih banyak sayangkuuuu love youuuu ❤️❤️❤️❤️</p>
                </div>
              )}
           </div>
        </div>

      </div>
    );
  }

  // 4. LANDING PAGE (APOLOGY)
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 to-orange-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Hearts */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <Heart className="absolute top-[10%] left-[10%] text-rose-300 w-16 h-16 animate-bounce" style={{animationDuration: '3s'}} />
        <Heart className="absolute top-[60%] left-[5%] text-pink-400 w-8 h-8 animate-pulse" />
        <Heart className="absolute bottom-[10%] right-[15%] text-rose-400 w-20 h-20 animate-bounce" style={{animationDuration: '4s'}} />
      </div>

      <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2rem] shadow-2xl max-w-md w-full z-10 text-center border border-white/60">
        <div 
          className="flex justify-center mb-8 cursor-pointer transition-transform active:scale-95"
          onClick={handleSecretClick}
          title="My heart is broken"
        >
          <HeartCrack className={`w-24 h-24 text-rose-500 ${adminClickCount > 0 ? 'animate-shake' : 'animate-pulse'}`} />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-800 mb-4 font-serif">Maaf banget.</h1>
        <p className="text-slate-600 mb-10 text-lg leading-relaxed">
           Aku yang salah. Kamu itu penting banget buat aku. <br/>
           Kira-kira kamu masih bisa maafin aku?
        </p>

        <div className="space-y-4">
          <button 
            onClick={onForgive}
            disabled={isSending}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-rose-200/50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
          >
            {isSending ? <span className="animate-pulse">Saving...</span> : (
              <>
                <Check className="w-6 h-6" />
                <span>Ya aku maafin</span>
              </>
            )}
          </button>

          <button 
            onClick={onTime}
            disabled={isSending}
            className="w-full bg-white hover:bg-slate-50 text-slate-600 font-semibold py-4 px-8 rounded-2xl shadow border border-slate-200 transition-all flex items-center justify-center gap-3"
          >
             {isSending ? <span className="animate-pulse">Saving...</span> : (
              <>
                <Clock className="w-5 h-5" />
                <span>Aku masih butuh waktu</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out; }
      `}</style>
    </div>
  );
}