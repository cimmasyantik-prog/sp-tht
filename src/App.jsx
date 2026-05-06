import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, List, Activity, Stethoscope, Settings, 
  LogOut, Search, Plus, Edit, Trash2, ShieldCheck, Eye, 
  ArrowRight, CheckSquare, RefreshCcw, X, Menu, Loader2
} from 'lucide-react';

// ============================================================================
// KONFIGURASI DATABASE (GOOGLE APPS SCRIPT URL)
// ============================================================================
// TEMPELKAN LINK WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzgiRHLaiPJF_in9TlefjemHmzRPdgYW9-9N14ZvnkOPUzKJET32YdlRqHXFzJA1uIt/exec"; 

// Data Mockup Cadangan (Akan digunakan jika URL di atas kosong atau API gagal)
const MOCK_DATA = {
  gejala: [
    { id: 'G01', name: 'Gatal pada liang telinga' },
    { id: 'G02', name: 'Sakit, terutama pada saat telinga disentuh atau ditarik' },
    { id: 'G03', name: 'Keluar cairan bening pada telinga' },
    { id: 'G04', name: 'Keluar cairan berwarna kuning atau bening dan berbau' },
    { id: 'G05', name: 'Gangguan pendengaran (pendengaran menurun)' },
    { id: 'G06', name: 'Telinga terasa penuh atau tersumbat' },
    { id: 'G07', name: 'Demam' },
    { id: 'G08', name: 'Muncul benjolan dileher atau sekitar telinga' },
    { id: 'G09', name: 'Vertigo dan pusing' },
    { id: 'G10', name: 'Telinga berdenging' },
    { id: 'G11', name: 'Nyeri telinga' },
    { id: 'G12', name: 'Demam disertai pilek' }
  ],
  penyakit: [
    { id: 'P01', name: 'Otitis eksterna', solusi: 'Jaga telinga tetap kering, obat tetes antibiotik.' },
    { id: 'P02', name: 'Otitis media', solusi: 'Obat pereda nyeri, antibiotik oral jika infeksi.' },
    { id: 'P03', name: 'Otitis interna', solusi: 'Istirahat, obat anti-vertigo.' },
    { id: 'P04', name: 'Gendang telinga pecah', solusi: 'Hindari air, segera ke spesialis THT.' },
    { id: 'P05', name: 'Kolesteatoma', solusi: 'Pembersihan telinga, operasi pada kasus lanjut.' },
    { id: 'P06', name: 'Presbikusis', solusi: 'Alat bantu dengar, hindari suara bising.' }
  ],
  aturan: [
    { id: 'R01', ifGejala: 'G01, G02, G03, G05, G06, G11', makaPenyakit: 'P01' },
    { id: 'R02', ifGejala: 'G04, G05, G07, G08, G10', makaPenyakit: 'P02' },
    { id: 'R03', ifGejala: 'G05, G09, G10', makaPenyakit: 'P03' },
    { id: 'R04', ifGejala: 'G05, G09, G10, G11', makaPenyakit: 'P04' },
    { id: 'R05', ifGejala: 'G04, G06, G11', makaPenyakit: 'P05' },
    { id: 'R06', ifGejala: 'G04, G05', makaPenyakit: 'P06' }
  ],
  riwayat: [
    { id: 'K001', pasien: 'Budi Santoso', penyakit: 'Gendang telinga pecah', prob: '0.00094', tgl: '2025-08-12' }
  ]
};

// Nilai Naive Bayes
const PRIOR_PROB = 0.08333; 
const PROB_YA = 0.22461;    
const PROB_TIDAK = 0.14769; 

// --- FUNGSI HELPER: Generator ID Dinamis (Mencegah Duplikasi) ---
const getNextId = (list, prefix) => {
  if (!list || list.length === 0) return `${prefix}01`;
  const max = Math.max(...list.map(item => {
    const num = parseInt(item.id.replace(prefix, ''), 10);
    return isNaN(num) ? 0 : num;
  }));
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
};

export default function App() {
  // Global States (Sinkronisasi dengan Backend)
  const [gejalaList, setGejalaList] = useState(MOCK_DATA.gejala);
  const [penyakitList, setPenyakitList] = useState(MOCK_DATA.penyakit);
  const [aturanList, setAturanList] = useState(MOCK_DATA.aturan);
  const [riwayatList, setRiwayatList] = useState(MOCK_DATA.riwayat);
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // Auth & Routing States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [loginMode, setLoginMode] = useState('pasien'); 
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');
  const [activePatientTab, setActivePatientTab] = useState('dashboard');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Auth Form States
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ nama: '', usia: '', username: '', password: '' });
  const [currentUser, setCurrentUser] = useState(null);

  // Patient Consultation States
  const [pasienData, setPasienData] = useState({ nama: '', umur: '', tglLahir: '', alamat: '' });
  const [selectedGejala, setSelectedGejala] = useState([]);
  const [hasilDiagnosa, setHasilDiagnosa] = useState([]);
  
  // Admin Modal States
  const [modal, setModal] = useState({ isOpen: false, type: '', data: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- EFEK PERTAMA KALI JALAN: AMBIL DATA DARI BACKEND ---
  useEffect(() => {
    if (APPS_SCRIPT_URL) {
      setIsLoadingDB(true);
      fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
          if(data.gejala) setGejalaList(data.gejala);
          if(data.penyakit) setPenyakitList(data.penyakit);
          if(data.aturan) setAturanList(data.aturan);
          if(data.riwayat) setRiwayatList(data.riwayat.reverse()); // Balik agar terbaru di atas
        })
        .catch(err => console.error("Gagal load database:", err))
        .finally(() => setIsLoadingDB(false));
    }
  }, []);

  // --- FUNGSI KOMUNIKASI POST KE BACKEND (APPS SCRIPT) ---
  const pushToBackend = (action, table, data) => {
    if (!APPS_SCRIPT_URL) return; // Skip jika belum disambung

    // Kirim secara background (Optimistic Update di UI)
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Plain text untuk bypass CORS Preflight Apps Script
      },
      body: JSON.stringify({ action, table, data })
    }).catch(err => console.error("Gagal sinkronisasi dengan Apps Script:", err));
  };


  // --- HANDLERS LOGIN & REGISTER ---
  const handleAuthInputChange = (e, isRegister = false) => {
    if (isRegister) setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    else setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginMode === 'admin') {
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        setIsAuthenticated(true);
        setUserRole('admin');
        setActiveAdminTab('dashboard');
      } else {
        alert('Username atau password administrator salah! (Gunakan default: admin / admin123)');
      }
    } else {
      setIsAuthenticated(true);
      setUserRole('pasien');
      setCurrentUser(credentials.username);
      setActivePatientTab('dashboard');
      setPasienData(prev => ({ ...prev, nama: credentials.username }));
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    alert("Anda berhasil mendaftar, silahkan login.");
    setIsRegistering(false);
    setCredentials({ ...credentials, username: registerData.username });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCredentials({ username: '', password: '' });
    setRegisterData({ nama: '', usia: '', username: '', password: '' });
    setPasienData({ nama: '', umur: '', tglLahir: '', alamat: '' });
    setSelectedGejala([]);
    setHasilDiagnosa([]);
  };

  // --- HANDLERS PASIEN (KONSULTASI & NAIVE BAYES) ---
  const prosesDiagnosa = () => {
    if (selectedGejala.length === 0) {
      alert("Harap pilih minimal satu gejala untuk melakukan diagnosa.");
      return;
    }

    let hasil = penyakitList.map(p => {
      let probabilitas = PRIOR_PROB;
      const aturan = aturanList.find(a => a.makaPenyakit === p.id);
      const gejalaTerkait = aturan ? aturan.ifGejala.split(',').map(s => s.trim()) : [];

      selectedGejala.forEach(g_id => {
        if (gejalaTerkait.includes(g_id)) {
          probabilitas *= PROB_YA;
        } else {
          probabilitas *= PROB_TIDAK;
        }
      });
      return { ...p, nilai: probabilitas };
    });

    hasil.sort((a, b) => b.nilai - a.nilai);
    setHasilDiagnosa(hasil);
    
    // Buat format Riwayat
    const topResult = hasil[0];
    const newRiwayat = {
      id: 'K' + String(Date.now()).slice(-4),
      pasien: pasienData.nama || currentUser || 'Anonim',
      penyakit: topResult.name,
      prob: topResult.nilai.toFixed(5),
      tgl: new Date().toLocaleDateString('id-ID')
    };
    
    // Update State UI
    setRiwayatList(prev => [newRiwayat, ...prev]);
    // Push ke Database Backend
    pushToBackend('ADD', 'Riwayat', newRiwayat);
    
    setActivePatientTab('proses');
  };

  // --- HANDLERS ADMIN CRUD ---
  const saveModalData = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formObj = Object.fromEntries(formData.entries());
    
    let table = '';
    let isEdit = modal.type.includes('EDIT');
    let action = isEdit ? 'EDIT' : 'ADD';

    if (modal.type.includes('GEJALA')) {
      table = 'Gejala';
      if(isEdit) setGejalaList(gejalaList.map(g => g.id === formObj.id ? formObj : g));
      else setGejalaList([...gejalaList, formObj]);
    }
    else if (modal.type.includes('PENYAKIT')) {
      table = 'Penyakit';
      if(isEdit) setPenyakitList(penyakitList.map(p => p.id === formObj.id ? formObj : p));
      else setPenyakitList([...penyakitList, formObj]);
    }
    else if (modal.type.includes('ATURAN')) {
      table = 'Aturan';
      if(isEdit) setAturanList(aturanList.map(a => a.id === formObj.id ? formObj : a));
      else setAturanList([...aturanList, formObj]);
    }

    // Push perubahan ke Backend
    pushToBackend(action, table, formObj);
    setModal({ isOpen: false, type: '', data: null });
  };

  const handleDelete = (type, id) => {
    if(!window.confirm('Yakin ingin menghapus data ini?')) return;
    
    let table = '';
    
    if (type === 'GEJALA') { table = 'Gejala'; setGejalaList(gejalaList.filter(g => g.id !== id)); }
    if (type === 'PENYAKIT') { table = 'Penyakit'; setPenyakitList(penyakitList.filter(p => p.id !== id)); }
    if (type === 'ATURAN') { table = 'Aturan'; setAturanList(aturanList.filter(a => a.id !== id)); }
    if (type === 'RIWAYAT') { table = 'Riwayat'; setRiwayatList(riwayatList.filter(r => r.id !== id)); }

    // Push instruksi hapus ke Backend
    pushToBackend('DELETE', table, { id: id });
  };


  // --- KOMPONEN MODAL GLOBAL ---
  const ModalComponent = () => {
    if (!modal.isOpen) return null;
    const isEdit = modal.type.includes('EDIT');
    
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800">
              {isEdit ? 'Edit Data' : 'Tambah Data'}
            </h3>
            <button onClick={() => setModal({ isOpen: false, type: '', data: null })} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <form key={modal.type + (modal.data?.id || 'new')} onSubmit={saveModalData} className="space-y-4">
            {/* Form Gejala */}
            {modal.type.includes('GEJALA') && (
              <>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">ID Gejala</label>
                  <input required name="id" defaultValue={modal.data?.id || getNextId(gejalaList, 'G')} readOnly={isEdit} className="w-full p-2 border rounded-lg bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Nama Gejala</label>
                  <input required name="name" defaultValue={modal.data?.name} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
              </>
            )}

            {/* Form Penyakit */}
            {modal.type.includes('PENYAKIT') && (
              <>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">ID Penyakit</label>
                  <input required name="id" defaultValue={modal.data?.id || getNextId(penyakitList, 'P')} readOnly={isEdit} className="w-full p-2 border rounded-lg bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Nama Penyakit</label>
                  <input required name="name" defaultValue={modal.data?.name} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Solusi / Penanganan</label>
                  <textarea required name="solusi" defaultValue={modal.data?.solusi} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows="4" />
                </div>
              </>
            )}

            {/* Form Aturan */}
            {modal.type.includes('ATURAN') && (
              <>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">ID Aturan</label>
                  <input required name="id" defaultValue={modal.data?.id || getNextId(aturanList, 'R')} readOnly={isEdit} className="w-full p-2 border rounded-lg bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Maka (Penyakit ID)</label>
                  <select required name="makaPenyakit" defaultValue={modal.data?.makaPenyakit || ''} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="" disabled>Pilih Penyakit</option>
                    {penyakitList.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">IF Gejala Terkait (Pisahkan koma: G01, G02)</label>
                  <textarea required name="ifGejala" defaultValue={modal.data?.ifGejala} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Contoh: G01, G02, G05" />
                </div>
              </>
            )}

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setModal({ isOpen: false, type: '', data: null })} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg">Batal</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Simpan Data</button>
            </div>
          </form>
        </div>
      </div>
    );
  };


  // ====================================================================================
  // VIEW RENDERERS
  // ====================================================================================

  // --- VIEWS ADMIN ---
  const DashboardAdmin = () => (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        Dashboard Admin 
        {isLoadingDB && <Loader2 size={18} className="animate-spin text-blue-500" />}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-lg text-blue-600"><Activity size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Gejala</p>
            <p className="text-2xl font-bold text-slate-800">{gejalaList.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-lg text-indigo-600"><Stethoscope size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Penyakit</p>
            <p className="text-2xl font-bold text-slate-800">{penyakitList.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-100 p-4 rounded-lg text-amber-600"><Settings size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Basis Aturan</p>
            <p className="text-2xl font-bold text-slate-800">{aturanList.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-lg text-green-600"><List size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Konsultasi</p>
            <p className="text-2xl font-bold text-slate-800">{riwayatList.length}</p>
          </div>
        </div>
      </div>
      
      {!APPS_SCRIPT_URL && (
        <div className="mt-8 bg-amber-50 p-6 rounded-xl border border-amber-200">
          <h3 className="text-lg font-bold text-amber-800 mb-2">⚠️ Database Belum Terhubung</h3>
          <p className="text-amber-700 text-sm">
            Saat ini aplikasi menggunakan <strong>Mock Data</strong> lokal. Masukkan URL hasil *deploy* Apps Script Anda pada baris kode <code>APPS_SCRIPT_URL</code> di Canvas agar data tersimpan di Google Sheets.
          </p>
        </div>
      )}
    </div>
  );

  const GejalaView = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Data Gejala</h2>
        <button onClick={() => setModal({ isOpen: true, type: 'ADD_GEJALA', data: null })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Tambah Gejala
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="py-3 px-4 border-b whitespace-nowrap">ID Gejala</th>
                <th className="py-3 px-4 border-b whitespace-nowrap">Nama Gejala</th>
                <th className="py-3 px-4 border-b text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {gejalaList.map(item => (
                <tr key={item.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono whitespace-nowrap">{item.id}</td>
                  {/* Class whitespace-normal dan pembatasan max-w memastikan teks gejala panjang turun ke baris baru */}
                  <td className="py-3 px-4 whitespace-normal min-w-[250px] max-w-md">{item.name}</td>
                  <td className="py-3 px-4 flex justify-center gap-2 whitespace-nowrap">
                    <button onClick={() => setModal({ isOpen: true, type: 'EDIT_GEJALA', data: item })} className="p-1.5 bg-amber-100 text-amber-600 rounded hover:bg-amber-200"><Edit size={16} /></button>
                    <button onClick={() => handleDelete('GEJALA', item.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const PenyakitView = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Data Penyakit</h2>
        <button onClick={() => setModal({ isOpen: true, type: 'ADD_PENYAKIT', data: null })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Tambah Penyakit
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="py-3 px-4 border-b whitespace-nowrap">ID</th>
                <th className="py-3 px-4 border-b whitespace-nowrap">Nama Penyakit</th>
                <th className="py-3 px-4 border-b whitespace-nowrap">Solusi / Penanganan</th>
                <th className="py-3 px-4 border-b text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {penyakitList.map(item => (
                <tr key={item.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono whitespace-nowrap">{item.id}</td>
                  <td className="py-3 px-4 font-bold whitespace-normal min-w-[150px] max-w-xs">{item.name}</td>
                  <td className="py-3 px-4 whitespace-normal min-w-[300px] max-w-md leading-relaxed">{item.solusi}</td>
                  <td className="py-3 px-4 flex justify-center gap-2 whitespace-nowrap">
                    <button onClick={() => setModal({ isOpen: true, type: 'EDIT_PENYAKIT', data: item })} className="p-1.5 bg-amber-100 text-amber-600 rounded hover:bg-amber-200"><Edit size={16} /></button>
                    <button onClick={() => handleDelete('PENYAKIT', item.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const AturanView = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Basis Aturan</h2>
        <button onClick={() => setModal({ isOpen: true, type: 'ADD_ATURAN', data: null })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Tambah Aturan
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="py-3 px-4 border-b whitespace-nowrap">ID Aturan</th>
                <th className="py-3 px-4 border-b whitespace-nowrap">IF Gejala Terkait</th>
                <th className="py-3 px-4 border-b whitespace-nowrap">Maka Penyakit</th>
                <th className="py-3 px-4 border-b text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {aturanList.map(item => {
                const penyakit = penyakitList.find(p => p.id === item.makaPenyakit);
                return (
                  <tr key={item.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono whitespace-nowrap">{item.id}</td>
                    <td className="py-3 px-4 font-mono text-blue-600 whitespace-normal min-w-[300px] max-w-lg leading-relaxed">{item.ifGejala}</td>
                    <td className="py-3 px-4 font-bold whitespace-normal min-w-[200px] max-w-sm"><span className="text-xs bg-slate-200 px-2 py-1 rounded mr-2 whitespace-nowrap">{item.makaPenyakit}</span>{penyakit?.name}</td>
                    <td className="py-3 px-4 flex justify-center gap-2 whitespace-nowrap">
                      <button onClick={() => setModal({ isOpen: true, type: 'EDIT_ATURAN', data: item })} className="p-1.5 bg-amber-100 text-amber-600 rounded hover:bg-amber-200"><Edit size={16} /></button>
                      <button onClick={() => handleDelete('ATURAN', item.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const RiwayatView = ({ isPatientOnly = false }) => {
    const displayList = isPatientOnly 
      ? riwayatList.filter(r => r.pasien === (pasienData.nama || currentUser))
      : riwayatList;

    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Riwayat Konsultasi</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm">
                  <th className="py-3 px-4 border-b whitespace-nowrap">ID Konsul</th>
                  {!isPatientOnly && <th className="py-3 px-4 border-b whitespace-nowrap">Nama Pasien</th>}
                  <th className="py-3 px-4 border-b whitespace-nowrap">Hasil Diagnosa</th>
                  <th className="py-3 px-4 border-b whitespace-nowrap">Nilai Probabilitas</th>
                  <th className="py-3 px-4 border-b whitespace-nowrap">Tanggal</th>
                  {!isPatientOnly && <th className="py-3 px-4 border-b text-center whitespace-nowrap">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {displayList.length === 0 ? (
                  <tr>
                    <td colSpan={isPatientOnly ? "5" : "6"} className="text-center py-6 text-slate-500">Belum ada riwayat.</td>
                  </tr>
                ) : (
                  displayList.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono whitespace-nowrap">{item.id}</td>
                      {!isPatientOnly && <td className="py-3 px-4 font-medium whitespace-normal min-w-[150px] max-w-[200px]">{item.pasien}</td>}
                      <td className="py-3 px-4 whitespace-normal min-w-[150px] max-w-[250px]"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">{item.penyakit}</span></td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap">{item.prob}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{item.tgl}</td>
                      {!isPatientOnly && (
                        <td className="py-3 px-4 flex justify-center whitespace-nowrap">
                          <button onClick={() => handleDelete('RIWAYAT', item.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- VIEWS PATIENT PORTAL FLOW ---
  const PatientKonsultasiFlow = () => {
    const handleInputChange = (e) => setPasienData({ ...pasienData, [e.target.name]: e.target.value });
    
    if (activePatientTab === 'data_diri') {
      return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
          <div className="bg-blue-600 text-white p-6"><h2 className="text-xl font-bold">Langkah 1: Data Diri</h2></div>
          <form onSubmit={(e) => { e.preventDefault(); setActivePatientTab('input_gejala'); }} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
              <input type="text" name="nama" required value={pasienData.nama || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Umur (Tahun)</label>
                <input type="number" name="umur" required min="1" value={pasienData.umur || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tgl Lahir (Opsional)</label>
                <input type="date" name="tglLahir" value={pasienData.tglLahir || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg mt-4 font-bold flex justify-center items-center gap-2 hover:bg-blue-700">
              Lanjut Pilih Gejala <ArrowRight size={18}/>
            </button>
          </form>
        </div>
      );
    }

    if (activePatientTab === 'input_gejala') {
      return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
          <div className="bg-blue-600 text-white p-6"><h2 className="text-xl font-bold">Langkah 2: Pilih Gejala</h2></div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gejalaList.map(g => (
                <label key={g.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedGejala.includes(g.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50'}`}>
                  <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 flex-shrink-0" checked={selectedGejala.includes(g.id)} 
                         onChange={() => setSelectedGejala(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])} />
                  <div className="break-words w-full">
                    <span className="font-bold block text-sm">{g.id}</span>
                    <span className="text-slate-600 whitespace-normal leading-snug block">{g.name}</span>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={prosesDiagnosa} className="w-full bg-green-600 text-white py-3 rounded-lg mt-6 font-bold flex justify-center items-center gap-2 hover:bg-green-700">
              <Activity size={20}/> Diagnosa Sekarang
            </button>
          </div>
        </div>
      );
    }

    if (activePatientTab === 'proses') {
      const maxVal = Math.max(...hasilDiagnosa.map(h => h.nilai));
      return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
          <div className="bg-slate-800 text-white p-6"><h2 className="text-xl font-bold">Proses Naïve Bayes</h2></div>
          <div className="p-6">
            <div className="space-y-4 mb-8">
              {hasilDiagnosa.map((h, idx) => {
                const barWidth = maxVal > 0 ? (h.nilai / maxVal) * 100 : 0;
                const isTop = idx === 0;
                return (
                  <div key={h.id}>
                    <div className="flex justify-between text-sm mb-1 flex-wrap gap-2">
                      <span className={`font-semibold break-words ${isTop ? 'text-blue-700' : 'text-slate-600'}`}>{h.id} - {h.name}</span>
                      <span className={`font-mono ${isTop ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>{h.nilai.toFixed(5)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4"><div className={`h-4 rounded-full transition-all duration-1000 ${isTop ? 'bg-blue-600' : 'bg-slate-400'}`} style={{ width: `${barWidth}%` }}></div></div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setActivePatientTab('hasil')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-blue-700">
              Lihat Kesimpulan <ArrowRight size={18}/>
            </button>
          </div>
        </div>
      );
    }

    if (activePatientTab === 'hasil') {
      const hasilTertinggi = hasilDiagnosa[0];
      return (
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden mt-6">
          <div className="bg-green-600 text-white p-6 text-center">
            <CheckSquare size={48} className="mx-auto mb-3 opacity-90" />
            <h2 className="text-2xl font-bold">Hasil Diagnosis</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-slate-600 mb-2">Kemungkinan terbesar pasien menderita penyakit:</p>
            <h3 className="text-3xl font-bold text-blue-700 mb-2">{hasilTertinggi?.name}</h3>
            <div className="inline-block bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-mono font-semibold mb-6">
              Probabilitas: {hasilTertinggi?.nilai?.toFixed(5)}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left mb-8">
              <h4 className="font-bold mb-2 flex items-center gap-2"><Stethoscope size={18}/> Penanganan:</h4>
              <p className="text-slate-700 whitespace-normal leading-relaxed">{hasilTertinggi?.solusi}</p>
            </div>
            <button onClick={() => { setSelectedGejala([]); setActivePatientTab('dashboard'); }} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Selamat Datang, {currentUser || 'Pasien'}!</h2>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center max-w-2xl mx-auto mt-10">
          <div className="bg-green-100 p-6 rounded-full text-green-600 inline-block mb-4"><Activity size={48} /></div>
          <h3 className="font-bold text-xl mb-2">Mulai Konsultasi Diagnosis THT</h3>
          <p className="text-slate-600 mb-6">Deteksi dini penyakit Anda berdasarkan gejala yang dialami.</p>
          <button onClick={() => setActivePatientTab('data_diri')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">Mulai Konsultasi</button>
        </div>
      </div>
    );
  };


  // ====================================================================================
  // LAYOUT & AUTH ROUTING
  // ====================================================================================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans py-10">
        <div className="bg-white p-8 sm:p-10 rounded-xl shadow-sm border border-slate-200 max-w-md w-full relative">
          
          {/* Label status API */}
          {!APPS_SCRIPT_URL && (
             <div className="absolute top-0 right-0 left-0 bg-amber-100 text-amber-800 text-xs py-1 px-3 text-center rounded-t-xl font-semibold border-b border-amber-200">
               Database: Mode Offline (Mock Data)
             </div>
          )}

          <div className="flex justify-center mb-6 mt-4">
            <div className="bg-blue-50 p-4 rounded-full text-[#2563eb] border border-blue-100 shadow-sm"><ShieldCheck size={48} strokeWidth={1.5} /></div>
          </div>

          {isRegistering && loginMode === 'pasien' ? (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-center text-slate-800 mb-8">Daftar Akun Baru</h1>
              <form onSubmit={handleRegister} className="space-y-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label><input type="text" name="nama" required value={registerData.nama || ''} onChange={e => handleAuthInputChange(e, true)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Masukkan nama lengkap" /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Username</label><input type="text" name="username" required value={registerData.username || ''} onChange={e => handleAuthInputChange(e, true)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buat username" /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Password</label><input type="password" name="password" required value={registerData.password || ''} onChange={e => handleAuthInputChange(e, true)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buat password" /></div>
                <button type="submit" className="w-full bg-[#2563eb] text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-4">Daftar</button>
              </form>
              <div className="mt-6 text-center text-sm text-slate-600">Sudah punya akun? <button onClick={() => setIsRegistering(false)} className="text-[#2563eb] font-semibold hover:underline">Masuk di sini</button></div>
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-center text-slate-800 mb-8">{loginMode === 'admin' ? 'Masuk sebagai Administrator' : 'Masuk ke Akun Anda'}</h1>
              <form onSubmit={handleLogin} className="space-y-5">
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Username</label><input type="text" name="username" required value={credentials.username || ''} onChange={handleAuthInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder={loginMode === 'admin' ? "Masukkan username admin" : "Masukkan username"} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Password</label><input type="password" name="password" required value={credentials.password || ''} onChange={handleAuthInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder={loginMode === 'admin' ? "Masukkan password admin" : "Masukkan password"} /></div>
                <button type="submit" className="w-full bg-[#2563eb] text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-2">Masuk</button>
              </form>
              
              {loginMode === 'pasien' && (
                <div className="mt-6 text-center text-sm text-slate-600">Belum punya akun? <button onClick={() => setIsRegistering(true)} className="text-[#2563eb] font-semibold hover:underline">Daftar di sini</button></div>
              )}
              
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button onClick={() => { setLoginMode(loginMode === 'pasien' ? 'admin' : 'pasien'); setCredentials({username: loginMode === 'pasien' ? 'admin' : '', password: loginMode === 'pasien' ? 'admin123' : ''}); setIsRegistering(false); }} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  Masuk sebagai {loginMode === 'pasien' ? 'Administrator' : 'Pasien'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- LAYOUT APLIKASI UTAMA ---
  const isPatient = userRole === 'pasien';

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <ModalComponent />
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`md:hidden fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 text-white shadow-md ${isPatient ? 'bg-blue-700' : 'bg-slate-800'}`}>
        <div className="flex items-center gap-2 font-bold">
          {isPatient ? <Activity size={24} /> : <ShieldCheck size={24} />}
          <span>{isPatient ? 'Portal Pasien' : 'Admin Panel'}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
      </div>
      
      <div className={`w-64 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isPatient ? 'bg-blue-700' : 'bg-slate-800'}`}>
        <div className={`flex items-center justify-between mb-8 px-2 py-4 border-b ${isPatient ? 'border-blue-600' : 'border-slate-600'}`}>
          <div className="flex items-center gap-3">
            {isPatient ? <Activity size={28} className="text-blue-200" /> : <ShieldCheck size={28} className="text-blue-400" />}
            <div>
              <h1 className="text-lg font-bold">{isPatient ? 'Portal Pasien' : 'Admin Panel'}</h1>
              <p className={`text-xs ${isPatient ? 'text-blue-200' : 'text-slate-400'}`}>Pakar THT Naïve Bayes</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-white/10 rounded-lg"><X size={20} /></button>
        </div>
        
        <nav className="flex flex-col gap-1 flex-grow">
          {isPatient ? (
            <>
              <button onClick={() => { setActivePatientTab('dashboard'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${['dashboard','data_diri','input_gejala','proses','hasil'].includes(activePatientTab) ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}><LayoutDashboard size={18} /> Konsultasi</button>
              <button onClick={() => { setActivePatientTab('riwayat'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activePatientTab === 'riwayat' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}><List size={18} /> Riwayat Saya</button>
            </>
          ) : (
            [
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
              { id: 'gejala', label: 'Data Gejala', icon: <Activity size={18} /> },
              { id: 'penyakit', label: 'Data Penyakit', icon: <Stethoscope size={18} /> },
              { id: 'aturan', label: 'Basis Aturan', icon: <Settings size={18} /> },
              { id: 'riwayat', label: 'Riwayat Konsultasi', icon: <List size={18} /> },
            ].map((item) => (
              <button key={item.id} onClick={() => { setActiveAdminTab(item.id); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeAdminTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                {item.icon} {item.label}
              </button>
            ))
          )}
        </nav>
        
        <div className={`mt-auto pt-4 border-t ${isPatient ? 'border-blue-600' : 'border-slate-700'}`}>
          <button onClick={handleLogout} className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium transition-colors ${isPatient ? 'text-blue-200 hover:bg-blue-800' : 'text-red-400 hover:bg-slate-700'}`}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="flex-grow md:ml-64 p-4 sm:p-8 overflow-auto h-screen pt-20 md:pt-8 w-full max-w-full relative">
        {isPatient ? (
          activePatientTab === 'riwayat' ? <RiwayatView isPatientOnly={true} /> : <PatientKonsultasiFlow />
        ) : (
          <div className="max-w-full">
            {activeAdminTab === 'dashboard' && <DashboardAdmin />}
            {activeAdminTab === 'gejala' && <GejalaView />}
            {activeAdminTab === 'penyakit' && <PenyakitView />}
            {activeAdminTab === 'aturan' && <AturanView />}
            {activeAdminTab === 'riwayat' && <RiwayatView />}
          </div>
        )}
      </div>
    </div>
  );
}