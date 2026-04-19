import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, query, orderBy 
} from "firebase/firestore";
import { 
  Clock, Save, Check, X, FileText, List, Settings, 
  AlertCircle, ChevronLeft, Plus, Star, Heart,
  Package, Edit3, Trash2, Calendar, User, Lock, Search, LogOut
} from 'lucide-react';

// ==========================================
// ⚠️ 請在此處替換為您從 Firebase 官網獲得的配置
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB0afDBWzu0ipn1pWeN1lcTS6PSarc40WQ",
  authDomain: "homeworktracker-cf7b9.firebaseapp.com",
  projectId: "homeworktracker-cf7b9",
  storageBucket: "homeworktracker-cf7b9.firebasestorage.app",
  messagingSenderId: "315814301918",
  appId: "1:315814301918:web:ce740cd96d8a288e27324f"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  // --- 基礎狀態 ---
  const [assignments, setAssignments] = useState([]);
  const [view, setView] = useState('student-search'); // 預設為學生查詢
  const [activeDate, setActiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState('');

  // --- 身份驗證 ---
  const [isTeacher, setIsTeacher] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // --- 學生查詢狀態 ---
  const [searchSeatNum, setSearchSeatNum] = useState('');
  const [studentResult, setStudentResult] = useState(null);

  // --- 其他 UI 狀態 ---
  const [assignmentModes, setAssignmentModes] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [setupData, setSetupData] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    totalStudents: 30,
    missingNumbersStr: '',
    targetTimeStr: ''
  });

  // --- 1. 雲端資料同步 (Firebase Real-time) ---
  useEffect(() => {
    const q = query(collection(db, "assignments"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. 輔助函式 ---
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const getNormStatus = (status) => {
    if (!status) return { isEmpty: false, collection: 'unsubmitted', correction: 'pending' };
    return status;
  };

  // --- 3. 管理功能 (雲端寫入) ---
  const handleLogin = () => {
    if (adminPassword === "1234") { // ⚠️ 您可以自行更改老師密碼
      setIsTeacher(true);
      setView('dashboard');
      showToast('🔑 老師身分驗證成功');
    } else {
      showToast('❌ 密碼錯誤');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const missingNums = setupData.missingNumbersStr.split(/[，,、\s]+/).map(Number);
    const initialStatuses = {};
    for (let i = 1; i <= setupData.totalStudents; i++) {
      initialStatuses[i] = {
        isEmpty: missingNums.includes(i),
        collection: 'unsubmitted',
        correction: 'pending'
      };
    }

    try {
      await addDoc(collection(db, "assignments"), {
        name: setupData.name,
        date: setupData.date,
        totalStudents: setupData.totalStudents,
        statuses: initialStatuses,
        createdAt: Date.now()
      });
      setView('dashboard');
      showToast('✅ 雲端任務已建立');
    } catch (e) { showToast('🔥 錯誤：' + e.message); }
  };

  const updateStudentStatus = async (assignId, num, newStatus) => {
    const assignment = assignments.find(a => a.id === assignId);
    const newStatuses = { ...assignment.statuses, [num]: newStatus };
    try {
      await updateDoc(doc(db, "assignments", assignId), { statuses: newStatuses });
    } catch (e) { showToast('同步失敗'); }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "assignments", deleteConfirmId));
      setDeleteConfirmId(null);
      showToast('🗑️ 資料已從雲端刪除');
    } catch (e) { showToast('刪除失敗'); }
  };

  // --- 4. 學生查詢邏輯 ---
  const handleStudentSearch = () => {
    const num = parseInt(searchSeatNum);
    if (isNaN(num)) return;

    const results = assignments.map(a => {
      const s = getNormStatus(a.statuses[num]);
      if (s.isEmpty) return null;
      return {
        name: a.name,
        date: a.date,
        isMissing: s.collection === 'unsubmitted',
        isPending: s.correction === 'pending' && s.collection !== 'unsubmitted'
      };
    }).filter(r => r && (r.isMissing || r.isPending));

    setStudentResult({ num, results });
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* 頂端列 */}
      <header className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <Heart className="fill-white" />
          <h1 className="text-xl font-black">作業追蹤雲端系統</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="font-mono bg-indigo-800 px-3 py-1 rounded-lg text-xl">{now.toLocaleTimeString()}</span>
          {isTeacher ? (
             <button onClick={() => {setIsTeacher(false); setView('student-search');}} className="flex items-center gap-1 bg-rose-500 px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
               <LogOut size={16}/> 登出
             </button>
          ) : (
             <button onClick={() => setView('login')} className="flex items-center gap-1 bg-white text-indigo-600 px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
               <Lock size={16}/> 老師登入
             </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* ================= 學生查詢視圖 ================= */}
        {view === 'student-search' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-800">學生/家長查詢</h2>
              <p className="text-slate-500 font-bold">請輸入座號查詢您目前「未交」或「待訂正」的作業</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border-4 border-indigo-100 flex gap-4">
              <input 
                type="number" 
                placeholder="輸入座號 (例: 12)" 
                className="flex-1 text-2xl font-black p-4 border-b-4 border-indigo-200 outline-none focus:border-indigo-500"
                value={searchSeatNum}
                onChange={(e) => setSearchSeatNum(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStudentSearch()}
              />
              <button onClick={handleStudentSearch} className="bg-indigo-600 text-white px-8 rounded-2xl font-black text-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
                <Search /> 查詢
              </button>
            </div>

            {studentResult && (
              <div className="space-y-4 animate-in slide-in-from-top-4">
                <h3 className="text-xl font-black text-indigo-600 flex items-center gap-2">
                  <User /> {studentResult.num} 號 的追蹤報表
                </h3>
                {studentResult.results.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {studentResult.results.map((r, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border-2 flex justify-between items-center ${r.isMissing ? 'bg-rose-50 border-rose-100' : 'bg-orange-50 border-orange-100'}`}>
                        <div>
                          <p className="text-xs font-bold text-slate-400">{r.date}</p>
                          <p className="text-xl font-black text-slate-700">{r.name}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full font-black text-white ${r.isMissing ? 'bg-rose-500' : 'bg-orange-500'}`}>
                          {r.isMissing ? '⚠️ 缺交' : '✍️ 待訂正'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border-4 border-emerald-100 p-12 rounded-[2rem] text-center">
                    <Star size={48} className="text-emerald-500 mx-auto mb-4" fill="currentColor"/>
                    <p className="text-2xl font-black text-emerald-600">全部都完成了！太棒了！</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= 老師登入視圖 ================= */}
        {view === 'login' && (
          <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-3xl shadow-xl border-4 border-slate-100 text-center">
            <Lock size={48} className="mx-auto text-indigo-500 mb-4" />
            <h2 className="text-2xl font-black mb-6">請輸入管理密碼</h2>
            <input 
              type="password" 
              className="w-full text-center text-3xl p-4 border-2 border-slate-200 rounded-2xl mb-6 outline-none focus:border-indigo-500" 
              autoFocus
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={handleLogin} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all">確認進入</button>
          </div>
        )}

        {/* ================= 老師管理介面 ================= */}
        {isTeacher && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 分頁與功能導覽列 */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setView('dashboard')} className={`px-6 py-2 rounded-full font-black ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border'}`}>主控台</button>
              <button onClick={() => setView('setup')} className={`px-6 py-2 rounded-full font-black ${view === 'setup' ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border'}`}>新增作業</button>
              <button onClick={() => setView('global-status')} className={`px-6 py-2 rounded-full font-black ${view === 'global-status' ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 border'}`}>總結報表</button>
            </div>

            {/* 管理面板：這裡保留您原本的邏輯，但將點擊事件改為 updateStudentStatus */}
            {view === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {assignments.map(a => (
                  <div key={a.id} className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-black text-slate-800">{a.name}</h3>
                      <button onClick={() => setDeleteConfirmId(a.id)} className="text-rose-300 hover:text-rose-500"><Trash2/></button>
                    </div>
                    {/* 老師點擊後會立即更新到 Firebase */}
                    <div className="grid grid-cols-10 gap-1.5">
                      {Object.entries(a.statuses).map(([num, st]) => (
                        <div 
                          key={num}
                          onClick={() => {
                            const current = getNormStatus(st);
                            let next = { ...current };
                            // 這裡簡易循環：已交 -> 補交 -> 缺交
                            if (next.collection === 'unsubmitted') next.collection = 'submitted';
                            else if (next.collection === 'submitted') next.collection = 'late';
                            else next.collection = 'unsubmitted';
                            updateStudentStatus(a.id, num, next);
                          }}
                          className={`aspect-square flex items-center justify-center rounded-lg font-black cursor-pointer text-white shadow-sm transition-all
                            ${getNormStatus(st).collection === 'submitted' ? 'bg-emerald-400' : getNormStatus(st).collection === 'late' ? 'bg-blue-400' : 'bg-rose-500'}`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 新增作業表單 */}
            {view === 'setup' && (
               <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-xl mx-auto border-4 border-amber-100">
                  <h2 className="text-2xl font-black text-amber-600 mb-6 flex items-center gap-2"><Plus/> 建立雲端新作業</h2>
                  <form onSubmit={handleCreateAssignment} className="space-y-4">
                     <input type="text" required placeholder="作業名稱" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-400 outline-none font-bold" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} />
                     <input type="date" required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-400 outline-none font-bold" value={setupData.date} onChange={e => setSetupData({...setupData, date: e.target.value})} />
                     <input type="number" placeholder="班級人數" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-400 outline-none font-bold" value={setupData.totalStudents} onChange={e => setSetupData({...setupData, totalStudents: e.target.value})} />
                     <button type="submit" className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-xl shadow-lg shadow-amber-200">發布到雲端</button>
                  </form>
               </div>
            )}
          </div>
        )}
      </main>

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-8 py-3 rounded-full z-[100] font-black animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
          {toast}
        </div>
      )}

      {/* 刪除確認彈窗 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-xs w-full text-center shadow-2xl">
            <Trash2 size={48} className="mx-auto text-rose-500 mb-4" />
            <h3 className="text-xl font-black mb-6">確定要永久刪除嗎？</h3>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">取消</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold">刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}