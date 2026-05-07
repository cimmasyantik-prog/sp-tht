import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, List, Activity, Stethoscope, Settings, 
  LogOut, Search, Plus, Edit, Trash2, ShieldCheck, Eye, 
  ArrowRight, ArrowLeft, CheckSquare, RefreshCcw, X, Menu, Loader2
} from 'lucide-react';

// ============================================================================
// KONFIGURASI DATABASE (GOOGLE APPS SCRIPT URL)
// ============================================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzgiRHLaiPJF_in9TlefjemHmzRPdgYW9-9N14ZvnkOPUzKJET32YdlRqHXFzJA1uIt/exec"; 

// --- DATA KNOWLEDGE BASE (Tabel 2.4, 2.5, 2.6 dari Dokumen) ---
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
    { id: 'P01', name: 'Otitis eksterna', solusi: 'Jaga telinga tetap kering, gunakan obat tetes telinga antibiotik sesuai resep dokter.' },
    { id: 'P02', name: 'Otitis media', solusi: 'Berikan obat pereda nyeri, jika infeksi bakteri dokter akan meresepkan antibiotik oral.' },
    { id: 'P03', name: 'Otitis interna', solusi: 'Istirahat cukup, hindari pergerakan kepala tiba-tiba, konsultasi ke dokter untuk obat anti-vertigo.' },
    { id: 'P04', name: 'Gendang telinga pecah', solusi: 'Hindari telinga kemasukan air, jangan meneteskan obat sembarangan, segera ke spesialis THT.' },
    { id: 'P05', name: 'Kolesteatoma', solusi: 'Pembersihan telinga profesional oleh dokter THT, pada kasus lanjut mungkin memerlukan operasi.' },
    { id: 'P06', name: 'Presbikusis', solusi: 'Konsultasi untuk penggunaan alat bantu dengar, hindari paparan suara bising.' }
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
    { id: 'K001', pasien: 'Contoh Pasien', penyakit: 'Gendang telinga pecah', prob: '0.00094', tgl: '12/08/2025' }
  ]
};

// Konstanta Perhitungan Naive Bayes
const PRIOR_PROB = 0.08333; 
const PROB_YA = 0.22461;    
const PROB_TIDAK = 0.14769; 

export default function App() {
  const [gejalaList, setGejalaList] = useState(MOCK_DATA.gejala);
  const [penyakitList, setPenyakitList] = useState(MOCK_DATA.penyakit);
  const [aturanList, setAturanList] = useState(MOCK_DATA.aturan);
  const [riwayatList, setRiwayatList] = useState(MOCK_DATA.riwayat);
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [loginMode, setLoginMode] = useState('pasien'); 
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');
  const [activePatientTab, setActivePatientTab] = useState('dashboard');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ nama: '', usia: '', username: '', password: '' });
  const [currentUser, setCurrentUser] = useState(null);

  const [pasienData, setPasienData] = useState({ nama: '', umur: '', tglLahir: '', alamat: '' });
  const [selectedGejala, setSelectedGejala] = useState([]);
  const [hasilDiagnosa, setHasilDiagnosa] = useState([]);
  
  const [modal, setModal] = useState({ isOpen: false, type: '', data: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- STATE CUSTOM DIALOG ---
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null, onCancel: null });

  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

  // --- FUNGSI HELPER ---
  const getNextId = (list, prefix) => {
    if (!list || list.length === 0) return `${prefix}01`;
    const max = Math.max(...list.map(item => {
      const num = parseInt(item.id.replace(prefix, ''), 10);
      return isNaN(num) ? 0 : num;
    }));
    return `${prefix}${String(max + 1).padStart(2, '0')}`;
  };

  const handleAuthInputChange = (e, isRegister = false) => {
    const { name, value } = e.target;
    if (isRegister) {
      setRegisterData(prev => ({ ...prev, [name]: value }));
    } else {
      setCredentials(prev => ({ ...prev, [name]: value }));
    }
  };

  const pushToBackend = (action, table, data) => {
    if (!APPS_SCRIPT_URL) return;
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, table, data })
    }).catch(err => console.error("Gagal sinkronisasi:", err));
  };

  // --- EFFECT: DATA SYNC ---
  useEffect(() => {
    if (APPS_SCRIPT_URL) {
      setIsLoadingDB(true);
      fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
          if(data.gejala && data.gejala.length > 0) setGejalaList(data.gejala);
          if(data.penyakit && data.penyakit.length > 0) setPenyakitList(data.penyakit);
          if(data.aturan && data.aturan.length > 0) setAturanList(data.aturan);
          if(data.riwayat && data.riwayat.length > 0) setRiwayatList(data.riwayat);
        })
        .catch(err => console.error("Gagal load database:", err))
        .finally(() => setIsLoadingDB(false));
    }
  }, []);

  // --- HANDLERS LOGIN & AUTH ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginMode === 'admin') {
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        setIsAuthenticated(true);
        setUserRole('admin');
        setActiveAdminTab('dashboard');
      } else {
        setDialog({
          isOpen: true,
          title: 'Login Gagal',
          message: 'Username atau password administrator salah! (Gunakan bawaan: admin / admin123)',
          type: 'alert',
          onConfirm: closeDialog
        });
      }
    } else {
      setIsAuthenticated(true);
      setUserRole('pasien');
      const name = credentials.username || 'Pasien';
      setCurrentUser(name);
      setActivePatientTab('dashboard');
      setPasienData(prev => ({ ...prev, nama: name }));
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setDialog({
      isOpen: true,
      title: 'Pendaftaran Berhasil',
      message: 'Akun Anda berhasil dibuat. Silakan masuk menggunakan akun tersebut.',
      type: 'alert',
      onConfirm: () => {
        setIsRegistering(false);
        setCredentials(prev => ({ ...prev, username: registerData.username }));
        closeDialog();
      }
    });
  };

  const doLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCredentials({ username: '', password: '' });
    setPasienData({ nama: '', umur: '', tglLahir: '', alamat: '' });
    setSelectedGejala([]);
    setHasilDiagnosa([]);
    closeDialog();
  };

  const handleLogout = () => {
    setDialog({
      isOpen: true,
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      type: 'confirm',
      onConfirm: doLogout,
      onCancel: closeDialog
    });
  };

  // --- INTERCEPTOR TOMBOL BACK (HP & BROWSER) ---
  useEffect(() => {
    if (isAuthenticated) {
      window.history.pushState({ app: 'pakar-tht' }, '', window.location.href);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handlePopState = (event) => {
      const isDashboard = userRole === 'pasien' 
        ? activePatientTab === 'dashboard' 
        : activeAdminTab === 'dashboard';

      if (isDashboard) {
        setDialog({
          isOpen: true,
          title: 'Konfirmasi Keluar',
          message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
          type: 'confirm',
          onConfirm: doLogout,
          onCancel: () => {
            window.history.pushState({ app: 'pakar-tht' }, '', window.location.href);
            closeDialog();
          }
        });
      } else {
        if (userRole === 'pasien') {
          if (activePatientTab === 'input_gejala') setActivePatientTab('data_diri');
          else if (activePatientTab === 'proses') setActivePatientTab('input_gejala');
          else if (activePatientTab === 'hasil') setActivePatientTab('dashboard');
          else setActivePatientTab('dashboard');
        } else {
          setActiveAdminTab('dashboard');
        }
        window.history.pushState({ app: 'pakar-tht' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, activePatientTab, activeAdminTab, userRole]);

  // --- LOGIKA DIAGNOSA ---
  const prosesDiagnosa = () => {
    if (selectedGejala.length === 0) {
      setDialog({
        isOpen: true,
        title: 'Peringatan',
        message: 'Harap centang minimal satu gejala yang Anda rasakan.',
        type: 'alert',
        onConfirm: closeDialog
      });
      return;
    }

    let hasil = penyakitList.map(p => {
      let probabilitas = PRIOR_PROB;
      const aturan = aturanList.find(a => a.makaPenyakit === p.id);
      const gejalaTerkait = aturan ? aturan.ifGejala.split(',').map(s => s.trim()) : [];

      selectedGejala.forEach(g_id => {
        if (gejalaTerkait.includes(g_id)) probabilitas *= PROB_YA;
        else probabilitas *= PROB_TIDAK;
      });
      return { ...p, nilai: probabilitas };
    });

    hasil.sort((a, b) => b.nilai - a.nilai);
    setHasilDiagnosa(hasil);
    
    const newRiwayat = {
      id: 'K' + String(Date.now()).slice(-4),
      pasien: pasienData.nama || currentUser || 'Anonim',
      penyakit: hasil[0].name,
      prob: hasil[0].nilai.toFixed(5),
      tgl: new Date().toLocaleDateString('id-ID')
    };
    
    setRiwayatList(prev => [newRiwayat, ...prev]);
    pushToBackend('ADD', 'Riwayat', newRiwayat);
    setActivePatientTab('proses');
  };

  const saveModalData = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formObj = Object.fromEntries(formData.entries());
    let table = '', isEdit = modal.type.includes('EDIT'), action = isEdit ? 'EDIT' : 'ADD';

    if (modal.type.includes('GEJALA')) {
      table = 'Gejala';
      setGejalaList(isEdit ? gejalaList.map(g => g.id === formObj.id ? formObj : g) : [...gejalaList, formObj]);
    } else if (modal.type.includes('PENYAKIT')) {
      table = 'Penyakit';
      setPenyakitList(isEdit ? penyakitList.map(p => p.id === formObj.id ? formObj : p) : [...penyakitList, formObj]);
    } else if (modal.type.includes('ATURAN')) {
      table = 'Aturan';
      setAturanList(isEdit ? aturanList.map(a => a.id === formObj.id ? formObj : a) : [...aturanList, formObj]);
    }

    pushToBackend(action, table, formObj);
    setModal({ isOpen: false, type: '', data: null });
  };

  const handleDelete = (type, id) => {
    setDialog({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      type: 'confirm',
      onConfirm: () => {
        let table = '';
        if (type === 'GEJALA') { table = 'Gejala'; setGejalaList(prev => prev.filter(g => g.id !== id)); }
        if (type === 'PENYAKIT') { table = 'Penyakit'; setPenyakitList(prev => prev.filter(p => p.id !== id)); }
        if (type === 'ATURAN') { table = 'Aturan'; setAturanList(prev => prev.filter(a => a.id !== id)); }
        if (type === 'RIWAYAT') { table = 'Riwayat'; setRiwayatList(prev => prev.filter(r => r.id !== id)); }
        pushToBackend('DELETE', table, { id });
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  // --- KOMPONEN CUSTOM DIALOG ---
  const DialogComponent = () => {
    if (!dialog.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
          <h3 className="font-black text-xl sm:text-2xl text-slate-800 mb-2">{dialog.title}</h3>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">{dialog.message}</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center w-full">
            {dialog.type === 'confirm' && (
              <button onClick={() => { if(dialog.onCancel) dialog.onCancel(); else closeDialog(); }} className="px-6 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm w-full">Batal</button>
            )}
            <button onClick={() => { if(dialog.onConfirm) dialog.onConfirm(); else closeDialog(); }} className="px-6 py-3 bg-blue-600 font-bold text-white rounded-xl hover:bg-blue-700 transition-all text-sm w-full shadow-lg shadow-blue-200">
              {dialog.type === 'confirm' ? 'Ya, Yakin' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- KOMPONEN TOMBOL KEMBALI (SMOOTH DESIGN) ---
  const BackButton = ({ onClick, label = "Kembali" }) => (
    <button 
      type="button"
      onClick={onClick} 
      className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-all duration-300 mb-6 group w-fit px-4 py-2 rounded-lg hover:bg-blue-50 active:scale-95"
    >
      <ArrowLeft size={18} className="transform group-hover:-translate-x-1.5 transition-transform duration-300" /> 
      {label}
    </button>
  );

  // --- SUB-KOMPONEN VIEW ADMIN ---
  const ModalComponent = () => {
    if (!modal.isOpen) return null;
    const isEdit = modal.type.includes('EDIT');
    return (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-slate-800">{isEdit ? 'Ubah Data' : 'Tambah Data'}</h3>
            <button onClick={() => setModal({ isOpen: false, type: '', data: null })} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
          </div>
          <form key={modal.type + (modal.data?.id || 'new')} onSubmit={saveModalData} className="space-y-4">
            {modal.type.includes('GEJALA') && (
              <>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">ID Gejala</label><input required name="id" defaultValue={modal.data?.id || getNextId(gejalaList, 'G')} readOnly={isEdit} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">Nama Gejala</label><input required name="name" defaultValue={modal.data?.name} placeholder="Contoh: Sakit telinga" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm" /></div>
              </>
            )}
            {modal.type.includes('PENYAKIT') && (
              <>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">ID Penyakit</label><input required name="id" defaultValue={modal.data?.id || getNextId(penyakitList, 'P')} readOnly={isEdit} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">Nama Penyakit</label><input required name="name" defaultValue={modal.data?.name} placeholder="Nama Penyakit" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">Solusi Medis</label><textarea required name="solusi" defaultValue={modal.data?.solusi} placeholder="Saran penanganan..." className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm" rows="4" /></div>
              </>
            )}
            {modal.type.includes('ATURAN') && (
              <>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">ID Aturan</label><input required name="id" defaultValue={modal.data?.id || getNextId(aturanList, 'R')} readOnly={isEdit} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">Penyakit Terkait</label><select required name="makaPenyakit" defaultValue={modal.data?.makaPenyakit || ''} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm">
                  <option value="" disabled>Pilih Penyakit</option>
                  {penyakitList.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                </select></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500">Daftar Gejala (IF)</label><textarea required name="ifGejala" defaultValue={modal.data?.ifGejala} placeholder="G01, G02, G05..." className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-mono text-sm" rows="3" /></div>
              </>
            )}
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setModal({ isOpen: false, type: '', data: null })} className="flex-1 py-3 bg-slate-100 font-semibold text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm">Batal</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 font-semibold text-white rounded-xl hover:bg-blue-700 shadow-md transition-all text-sm">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const GejalaView = () => (
    <div className="animate-in fade-in duration-500 max-w-full">
      <BackButton onClick={() => setActiveAdminTab('dashboard')} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Data Gejala</h2>
        <button onClick={() => setModal({ isOpen: true, type: 'ADD_GEJALA', data: null })} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition-all w-full sm:w-auto text-sm"><Plus size={18} /> Tambah Gejala</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-max">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b"><th className="py-4 px-6">ID</th><th className="py-4 px-6">Nama Gejala</th><th className="py-4 px-6 text-center">Opsi</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {gejalaList.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-blue-600">{item.id}</td>
                  <td className="py-4 px-6 whitespace-normal max-w-[200px] sm:max-w-md">{item.name}</td>
                  <td className="py-4 px-6 flex justify-center gap-2"><button onClick={() => setModal({ isOpen: true, type: 'EDIT_GEJALA', data: item })} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"><Edit size={16} /></button><button onClick={() => handleDelete('GEJALA', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const PenyakitView = () => (
    <div className="animate-in fade-in duration-500 max-w-full">
      <BackButton onClick={() => setActiveAdminTab('dashboard')} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Data Penyakit</h2>
        <button onClick={() => setModal({ isOpen: true, type: 'ADD_PENYAKIT', data: null })} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition-all w-full sm:w-auto text-sm"><Plus size={18} /> Tambah Penyakit</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-max border-collapse">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b"><th className="py-4 px-6">ID</th><th className="py-4 px-6">Penyakit</th><th className="py-4 px-6">Solusi Penanganan</th><th className="py-4 px-6 text-center">Opsi</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {penyakitList.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-blue-600">{item.id}</td>
                  <td className="py-4 px-6 font-semibold whitespace-normal max-w-[150px]">{item.name}</td>
                  <td className="py-4 px-6 whitespace-normal max-w-[200px] sm:max-w-lg leading-relaxed">{item.solusi}</td>
                  <td className="py-4 px-6 flex justify-center gap-2"><button onClick={() => setModal({ isOpen: true, type: 'EDIT_PENYAKIT', data: item })} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"><Edit size={16}/></button><button onClick={() => handleDelete('PENYAKIT', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const AturanView = () => (
    <div className="animate-in fade-in duration-500 max-w-full">
      <BackButton onClick={() => setActiveAdminTab('dashboard')} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Basis Aturan</h2>
        <button onClick={() => setModal({ isOpen: true, type: 'ADD_ATURAN', data: null })} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition-all w-full sm:w-auto text-sm"><Plus size={18} /> Tambah Aturan</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-max border-collapse">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b"><th className="py-4 px-6">ID</th><th className="py-4 px-6">IF (Gejala)</th><th className="py-4 px-6">Maka (Penyakit)</th><th className="py-4 px-6 text-center">Opsi</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {aturanList.map(item => {
                const penyakit = penyakitList.find(p => p.id === item.makaPenyakit);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-blue-600">{item.id}</td>
                    <td className="py-4 px-6 font-mono text-blue-600 bg-blue-50/50 rounded-lg p-2 m-2 inline-block whitespace-normal max-w-[200px] sm:max-w-xs">{item.ifGejala}</td>
                    <td className="py-4 px-6 font-semibold whitespace-normal max-w-[150px]">{penyakit?.name || item.makaPenyakit}</td>
                    <td className="py-4 px-6 flex justify-center gap-2"><button onClick={() => setModal({ isOpen: true, type: 'EDIT_ATURAN', data: item })} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"><Edit size={16}/></button><button onClick={() => handleDelete('ATURAN', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const RiwayatView = ({ isPatientOnly = false }) => {
    const list = isPatientOnly ? riwayatList.filter(r => r.pasien === (pasienData.nama || currentUser)) : riwayatList;
    return (
      <div className={`animate-in fade-in duration-500 max-w-full ${isPatientOnly ? 'lg:max-w-5xl mx-auto' : ''}`}>
        <BackButton onClick={() => isPatientOnly ? setActivePatientTab('dashboard') : setActiveAdminTab('dashboard')} />
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Riwayat Konsultasi</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-max border-collapse">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b"><th className="py-4 px-6">ID</th>{!isPatientOnly && <th className="py-4 px-6">Pasien</th>}<th className="py-4 px-6">Hasil Diagnosa</th><th className="py-4 px-6">Prob</th><th className="py-4 px-6">Tanggal</th>{!isPatientOnly && <th className="py-4 px-6 text-center">Opsi</th>}</tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {list.length === 0 ? <tr><td colSpan="6" className="text-center py-10 text-slate-400 italic">Belum ada riwayat konsultasi.</td></tr> : list.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold">{item.id}</td>
                    {!isPatientOnly && <td className="py-4 px-6 font-medium whitespace-normal max-w-[150px]">{item.pasien}</td>}
                    <td className="py-4 px-6"><span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-green-200 whitespace-normal block text-center sm:inline-block max-w-[150px] sm:max-w-none">{item.penyakit}</span></td>
                    <td className="py-4 px-6 font-mono text-slate-500">{item.prob}</td>
                    <td className="py-4 px-6 text-slate-500">{item.tgl}</td>
                    {!isPatientOnly && <td className="py-4 px-6 flex justify-center"><button onClick={() => handleDelete('RIWAYAT', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const PatientKonsultasiFlow = () => {
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setPasienData(prev => ({ ...prev, [name]: value }));
    };
    
    switch (activePatientTab) {
      case 'data_diri':
        return (
          <div className="max-w-2xl mx-auto mt-2 animate-in slide-in-from-right duration-300">
            <BackButton onClick={() => setActivePatientTab('dashboard')} />
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 text-white p-6 sm:p-8"><h2 className="text-xl font-bold">Langkah 1: Data Diri</h2><p className="text-blue-100 text-sm mt-1">Lengkapi informasi pasien sebelum memulai diagnosis.</p></div>
              <form onSubmit={(e) => { e.preventDefault(); setActivePatientTab('input_gejala'); }} className="p-6 sm:p-8 space-y-5">
                <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Nama Lengkap Pasien</label><input required name="nama" value={pasienData.nama || ''} onChange={handleInputChange} placeholder="Masukkan nama Anda" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Umur (Tahun)</label><input type="number" required name="umur" value={pasienData.umur || ''} onChange={handleInputChange} placeholder="Tahun" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Tanggal Lahir</label><input type="date" name="tglLahir" value={pasienData.tglLahir || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" /></div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-sm mt-2">Lanjut Pilih Gejala <ArrowRight size={18}/></button>
              </form>
            </div>
          </div>
        );
      case 'input_gejala':
        return (
          <div className="max-w-4xl mx-auto mt-2 animate-in slide-in-from-right duration-300">
            <BackButton onClick={() => setActivePatientTab('data_diri')} />
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 text-white p-6 sm:p-8"><h2 className="text-xl font-bold">Langkah 2: Pilih Gejala</h2><p className="text-blue-100 text-sm mt-1">Centang gejala-gejala yang sedang Anda rasakan saat ini.</p></div>
              <div className="p-4 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {gejalaList.map(g => (
                    <label key={g.id} className={`flex items-start gap-3 sm:gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${selectedGejala.includes(g.id) ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 rounded flex-shrink-0" checked={selectedGejala.includes(g.id)} onChange={() => setSelectedGejala(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])} />
                      <div className="text-sm"><strong className="text-blue-700 block mb-0.5">{g.id}</strong><p className="text-slate-700 font-medium leading-snug">{g.name}</p></div>
                    </label>
                  ))}
                </div>
                <button onClick={prosesDiagnosa} className="w-full bg-green-600 text-white py-3.5 rounded-xl mt-8 font-bold text-base flex justify-center items-center gap-2 hover:bg-green-700 shadow-sm transition-all">
                  <Activity size={20}/> Diagnosa Sekarang
                </button>
              </div>
            </div>
          </div>
        );
      case 'proses':
        const maxVal = Math.max(...hasilDiagnosa.map(h => h.nilai));
        return (
          <div className="max-w-4xl mx-auto mt-2 animate-in slide-in-from-right duration-300">
            <BackButton onClick={() => setActivePatientTab('input_gejala')} />
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white p-6 sm:p-8"><h2 className="text-xl font-bold uppercase">Analisis Naïve Bayes</h2><p className="text-slate-400 text-sm mt-1">Sistem sedang menghitung probabilitas penyakit THT Anda.</p></div>
              <div className="p-6 sm:p-8 space-y-5">
                {hasilDiagnosa.map((h, idx) => (
                  <div key={h.id} className="group">
                    <div className="flex justify-between text-xs mb-1.5 font-semibold uppercase tracking-wider">
                      <span className={idx === 0 ? 'text-blue-600' : 'text-slate-500'}>{h.name}</span>
                      <span className="font-mono text-slate-400">{h.nilai.toFixed(6)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-[1500ms] ease-out ${idx === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} style={{ width: `${maxVal > 0 ? (h.nilai/maxVal)*100 : 0}%` }}></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setActivePatientTab('hasil')} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 hover:bg-blue-700 shadow-sm mt-8 transition-all">Lihat Kesimpulan <ArrowRight size={20}/></button>
              </div>
            </div>
          </div>
        );
      case 'hasil':
        const h = hasilDiagnosa[0];
        return (
          <div className="max-w-3xl mx-auto mt-2 animate-in zoom-in-95 duration-500">
            <BackButton onClick={() => { setSelectedGejala([]); setActivePatientTab('dashboard'); }} label="Selesai & Tutup" />
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-green-600 text-white p-8 sm:p-10 text-center relative overflow-hidden">
                <CheckSquare size={48} className="mx-auto mb-3 drop-shadow-md" />
                <h2 className="text-2xl font-bold uppercase">Hasil Diagnosis</h2>
              </div>
              <div className="p-6 sm:p-10 text-center">
                <p className="text-slate-500 mb-2 font-semibold text-sm">Berdasarkan gejala yang dipilih, penyakit yang terdeteksi:</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-3 leading-tight">{h?.name}</h3>
                <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 inline-block border border-blue-100">Probabilitas: {h?.nilai?.toFixed(6)}</div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left mb-8 relative">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-base"><Stethoscope size={18} className="text-green-600"/> Penanganan Awal:</h4>
                  <p className="text-slate-600 leading-relaxed text-sm">{h?.solusi}</p>
                </div>
                <button onClick={() => { setSelectedGejala([]); setActivePatientTab('dashboard'); }} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 transition-all shadow-md w-full sm:w-auto">Kembali ke Dashboard</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center mt-6 sm:mt-10 animate-in slide-in-from-bottom duration-500">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Selamat Datang, {currentUser}!</h2>
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 max-w-lg mx-auto hover:shadow-md transition-shadow">
              <div className="bg-blue-50 p-6 rounded-full text-blue-600 inline-block mb-6"><Activity size={48} /></div>
              <h3 className="font-bold text-xl sm:text-2xl mb-2 text-slate-800">Diagnosis THT</h3>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">Lakukan deteksi dini kesehatan Telinga, Hidung, dan Tenggorokan Anda menggunakan kecerdasan buatan.</p>
              <button onClick={() => setActivePatientTab('data_diri')} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-blue-700 shadow-sm transition-all active:scale-95">Mulai Konsultasi</button>
            </div>
          </div>
        );
    }
  };

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4 sm:p-6">
        <DialogComponent />
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          {!APPS_SCRIPT_URL && <div className="absolute top-3 inset-x-0 bg-amber-400 text-white text-[10px] py-1 text-center font-bold uppercase tracking-widest">Database Offline</div>}
          <div className="flex justify-center mb-8 mt-4"><div className="bg-blue-50 p-5 rounded-full text-blue-600"><ShieldCheck size={40} /></div></div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-800">Daftar Akun</h1><p className="text-sm text-slate-500 mt-1">Buat profil pasien baru</p></div>
              <input required name="nama" placeholder="Nama Lengkap" onChange={e => handleAuthInputChange(e, true)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
              <input required name="username" placeholder="Username" onChange={e => handleAuthInputChange(e, true)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
              <input required type="password" name="password" placeholder="Password" onChange={e => handleAuthInputChange(e, true)} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
              <button className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 shadow-sm transition-all text-sm mt-2">Daftar Sekarang</button>
              <div className="text-center text-sm text-slate-500 mt-4">Sudah punya akun? <button type="button" onClick={() => setIsRegistering(false)} className="text-blue-600 font-semibold hover:underline">Masuk</button></div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-800">{loginMode === 'admin' ? 'Administrator' : 'Portal Pasien'}</h1><p className="text-sm text-slate-500 mt-1">Sistem Pakar THT</p></div>
              <div className="space-y-3">
                <input required name="username" value={credentials.username} placeholder="Username" onChange={handleAuthInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" />
                <input required type="password" name="password" value={credentials.password} placeholder="Password" onChange={handleAuthInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <button className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 shadow-sm transition-all text-sm mt-2">Masuk Ke Sistem</button>
              {loginMode === 'pasien' && <div className="text-center text-sm text-slate-500 mt-4">Belum memiliki akun? <button type="button" onClick={() => setIsRegistering(true)} className="text-blue-600 font-semibold hover:underline">Daftar</button></div>}
              <div className="mt-8 border-t border-slate-100 pt-6 text-center"><button type="button" onClick={() => { setLoginMode(loginMode === 'pasien' ? 'admin' : 'pasien'); setCredentials({username: loginMode === 'pasien' ? 'admin' : '', password: loginMode === 'pasien' ? 'admin123' : ''}); }} className="text-xs font-semibold text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-wider">Login {loginMode === 'pasien' ? 'Administrator' : 'Pasien'}</button></div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN LAYOUT ---
  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
      <DialogComponent />
      <ModalComponent />
      
      {/* OVERLAY SIDEBAR MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-all duration-300" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* MOBILE HEADER */}
      <div className={`md:hidden fixed top-0 inset-x-0 h-16 z-30 flex items-center justify-between px-5 text-white shadow-md ${userRole === 'admin' ? 'bg-slate-900' : 'bg-blue-700'}`}>
        <div className="flex items-center gap-2 font-bold text-lg">
          {userRole === 'pasien' ? <Activity size={20}/> : <ShieldCheck size={20}/>} 
          <span>{userRole === 'pasien' ? 'PASIEN' : 'ADMIN'}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-all"><Menu size={22}/></button>
      </div>

      {/* SIDEBAR (Responsive & Scrollable) */}
      <div className={`w-64 md:w-72 text-white h-screen p-5 flex flex-col fixed left-0 top-0 z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${userRole === 'pasien' ? 'bg-blue-800' : 'bg-slate-900'}`}>
        <div className="flex items-center justify-between mb-8 px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg"><Stethoscope size={24} className="text-blue-200" /></div>
            <div><h1 className="text-xl font-bold">Pakar THT</h1><p className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">Naïve Bayes</p></div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><X size={18}/></button>
        </div>

        <nav className="flex flex-col gap-2 flex-grow text-white">
          {userRole === 'pasien' ? (
            <>
              <button onClick={() => { setActivePatientTab('dashboard'); setIsSidebarOpen(false); }} className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activePatientTab === 'dashboard' ? 'bg-white/10 shadow-inner' : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}><LayoutDashboard size={18}/> Konsultasi</button>
              <button onClick={() => { setActivePatientTab('riwayat'); setIsSidebarOpen(false); }} className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activePatientTab === 'riwayat' ? 'bg-white/10 shadow-inner' : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}><List size={18}/> Riwayat Saya</button>
            </>
          ) : (
            [
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/> },
              { id: 'gejala', label: 'Data Gejala', icon: <Activity size={18}/> },
              { id: 'penyakit', label: 'Data Penyakit', icon: <Stethoscope size={18}/> },
              { id: 'aturan', label: 'Basis Aturan', icon: <Settings size={18}/> },
              { id: 'riwayat', label: 'Riwayat Konsultasi', icon: <List size={18}/> },
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveAdminTab(item.id); setIsSidebarOpen(false); }} className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeAdminTab === item.id ? 'bg-blue-600 shadow-md text-white' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}>{item.icon} {item.label}</button>
            ))
          )}
        </nav>

        {/* Footer Sidebar padding bottom extra to ensure visible while scrolling */}
        <div className="mt-8 pt-4 pb-4 border-t border-white/10">
           <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/20 transition-all"><LogOut size={18}/> Keluar Sistem</button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-grow md:ml-72 p-5 sm:p-8 md:p-10 overflow-x-hidden h-screen pt-20 md:pt-10 w-full relative animate-in fade-in duration-500">
        {userRole === 'pasien' ? (
          activePatientTab === 'riwayat' ? <RiwayatView isPatientOnly={true} /> : <PatientKonsultasiFlow />
        ) : (
          <div className="max-w-full space-y-8">
            {activeAdminTab === 'dashboard' && (
              <>
                <div className="flex items-center justify-between mb-2">
                   <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">Ringkasan Data</h2>
                   {isLoadingDB && <Loader2 className="animate-spin text-blue-600 w-6 h-6" />}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div onClick={() => setActiveAdminTab('gejala')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group">
                    <div className="bg-blue-50 p-4 rounded-xl text-blue-600 group-hover:scale-105 transition-transform"><Activity size={24}/></div>
                    <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gejala</p><p className="text-2xl font-bold text-slate-800">{gejalaList.length}</p></div>
                  </div>
                  <div onClick={() => setActiveAdminTab('penyakit')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group">
                    <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600 group-hover:scale-105 transition-transform"><Stethoscope size={24}/></div>
                    <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penyakit</p><p className="text-2xl font-bold text-slate-800">{penyakitList.length}</p></div>
                  </div>
                  <div onClick={() => setActiveAdminTab('aturan')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group">
                    <div className="bg-amber-50 p-4 rounded-xl text-amber-600 group-hover:scale-105 transition-transform"><Settings size={24}/></div>
                    <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aturan</p><p className="text-2xl font-bold text-slate-800">{aturanList.length}</p></div>
                  </div>
                  <div onClick={() => setActiveAdminTab('riwayat')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-green-300 transition-all group">
                    <div className="bg-green-50 p-4 rounded-xl text-green-600 group-hover:scale-105 transition-transform"><List size={24}/></div>
                    <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selesai</p><p className="text-2xl font-bold text-slate-800">{riwayatList.length}</p></div>
                  </div>
                </div>
              </>
            )}
            {activeAdminTab === 'gejala' && <GejalaView />}
            {activeAdminTab === 'penyakit' && <PenyakitView />}
            {activeAdminTab === 'aturan' && <AturanView />}
            {activeAdminTab === 'riwayat' && <RiwayatView isPatientOnly={false} />}
          </div>
        )}
      </div>
    </div>
  );
}
