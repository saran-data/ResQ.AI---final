import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { donationsAPI, ngosAPI } from '../services/api.jsx';
import DonationForm from '../components/DonationForm';
import MapView from '../components/MapView';

// ─────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────
const fmt = {
  hoursLeft: (iso) => {
    if (!iso) return null;
    return Math.round((new Date(iso) - new Date()) / 3_600_000);
  },
  hoursColor: (h) =>
    h == null ? 'text-gray-400' : h <= 4 ? 'text-red-600 font-semibold' : h <= 12 ? 'text-orange-500 font-medium' : 'text-green-600',
  statusBadge: (status) => {
    const m = {
      open:      'bg-green-100 text-green-800',
      matched:   'bg-blue-100 text-blue-800',
      picked_up: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-gray-100 text-gray-700',
      expired:   'bg-red-100 text-red-700',
      cancelled: 'bg-red-50 text-red-600',
    };
    return m[status] || 'bg-gray-100 text-gray-600';
  },
  statusLabel: (s) => ({ open:'Available', matched:'Matched', picked_up:'Picked Up', delivered:'Delivered', expired:'Expired', cancelled:'Cancelled' }[s] || s),
};

// ─────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-xl text-white text-sm font-medium flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
    </div>
  );
};

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return [toast, show];
}

// ─────────────────────────────────────────────────────────────────
// Main Dashboard shell
// ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user, logout } = useAuth();
  const getDefaultTab = () => ({ donor:'donor', ngo:'ngo', volunteer:'volunteer', admin:'admin' }[user?.role] || 'donor');

  const [activeTab, setActiveTab]   = useState(getDefaultTab);
  const [donations,  setDonations]  = useState([]);
  const [ngos,       setNGOs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const loadDonations = useCallback(async () => {
    try { setLoading(true); const r = await donationsAPI.getAll(); setDonations(r.data.donations || []); }
    catch (e) { setError('Failed to load donations'); }
    finally { setLoading(false); }
  }, []);

  const loadNGOs = useCallback(async () => {
    try { const r = await ngosAPI.getAll(); setNGOs(r.data.ngos || []); }
    catch {}
  }, []);

  useEffect(() => {
    loadDonations();
    if (['ngo', 'admin'].includes(activeTab)) loadNGOs();
  }, [activeTab]);

  const handleDonationCreate = async (donationData) => {
    try {
      setLoading(true);
      if (donationData.location?.address && !donationData.location.lat) {
        donationData.location.lat = 13.0850;
        donationData.location.lng = 80.2101;
      }
      await donationsAPI.create(donationData);
      setSuccess('✅ Donation posted successfully!');
      await loadDonations();
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to create donation';
      setError(msg);
      return { success: false, error: msg };
    } finally { setLoading(false); }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

  const TABS = [
    { id: 'donor',     label: 'Donor Dashboard',     icon: '🍱', roles: ['donor', 'admin'] },
    { id: 'ngo',       label: 'NGO Dashboard',        icon: '🏢', roles: ['ngo',   'admin'] },
    { id: 'volunteer', label: 'Volunteer Dashboard',  icon: '🚚', roles: ['volunteer', 'admin'] },
    { id: 'admin',     label: 'Admin',                icon: '👤', roles: ['admin'] },
    { id: 'chat',      label: 'AI Assistant',         icon: '🤖', roles: ['donor', 'ngo', 'volunteer', 'admin'] },
  ].filter(t => user?.role === 'admin' || t.roles.includes(user?.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'donor':     return <DonorView     onSubmit={handleDonationCreate} donations={donations} loading={loading} onRefresh={loadDonations} />;
      case 'ngo':       return <NGOView       donations={donations} loading={loading} onRefresh={loadDonations} ngos={ngos} />;
      case 'volunteer': return <VolunteerView user={user} donations={donations} loading={loading} onRefresh={loadDonations} />;
      case 'admin':     return <AdminView     donations={donations} ngos={ngos} loading={loading} onRefresh={() => { loadDonations(); loadNGOs(); }} />;
      case 'chat':      return <ChatAssistant user={user} />;
      default:          return null;
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="spinner mx-auto"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍱</span>
              <div>
                <h1 className="text-lg font-bold text-blue-600 leading-none">ResQ-AI</h1>
                <p className="text-xs text-gray-400">Food Rescue Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                user.role === 'donor' ? 'bg-green-100 text-green-700' :
                user.role === 'ngo'   ? 'bg-blue-100 text-blue-700' :
                user.role === 'volunteer' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'}`}>
                {user.role.toUpperCase()}
              </span>
              <button onClick={logout} className="btn btn-secondary text-xs px-3 py-1.5">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {error   && <div className="alert alert-error   mb-2 flex justify-between"><span>{error}</span>  <button onClick={clearMessages}>×</button></div>}
          {success && <div className="alert alert-success mb-2 flex justify-between"><span>{success}</span><button onClick={clearMessages}>×</button></div>}
        </div>
      )}

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b sticky top-[65px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); clearMessages(); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <span>{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🍱 DONOR DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const DonorView = ({ onSubmit, donations, loading, onRefresh }) => {
  const { user } = useAuth();
  const [showForm, setShowForm]       = useState(false);
  const [showNGOPanel, setShowNGOPanel] = useState(false);
  const [nearbyNGOs, setNearbyNGOs]   = useState([]);
  const [loadingNGOs, setLoadingNGOs] = useState(false);
  const [aiRec, setAiRec]             = useState('');
  const [search, setSearch]           = useState({ maxDistance: 20, foodType: '', quantity: '' });
  const [activeSection, setActiveSection] = useState('overview'); // overview | history | map
  const [cancelLoading, setCancelLoading] = useState({});
  const [toast, showToast] = useToast();

  const stats = {
    total:     donations.length,
    active:    donations.filter(d => d.status === 'open').length,
    matched:   donations.filter(d => d.status === 'matched').length,
    delivered: donations.filter(d => d.status === 'delivered').length,
    meals:     donations.reduce((s, d) => s + Math.ceil((d.quantity || 0) * (d.unit === 'kg' ? 4 : d.unit === 'liters' ? 4 : 1)), 0),
  };

  const searchNGOs = async () => {
    setLoadingNGOs(true); setAiRec('');
    try {
      if (!user?.location?.lat) { setAiRec('Add your location in your profile to search nearby NGOs.'); return; }
      const r = await ngosAPI.search({ lat: user.location.lat, lng: user.location.lng, address: user.location.address, ...search, dietary: { isVegetarian: true, isHalal: true } });
      if (r.data.success) { setNearbyNGOs(r.data.ngos || []); setAiRec(r.data.aiRecommendation || ''); }
      else setAiRec(r.data.error || 'Search failed');
    } catch { setAiRec('Search failed. Check your connection.'); }
    finally { setLoadingNGOs(false); }
  };

  const cancelDonation = async (id) => {
    setCancelLoading(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/donations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok) { showToast('success', 'Donation cancelled.'); onRefresh(); }
      else showToast('error', data.error || 'Failed to cancel');
    } catch { showToast('error', 'Network error'); }
    finally { setCancelLoading(p => ({ ...p, [id]: false })); }
  };

  const FOOD_TIPS = [
    '🌡️ Cooked food must be kept above 60°C or below 5°C to prevent bacterial growth.',
    '📦 Use sealed, food-grade containers for all donations to prevent contamination.',
    '⏰ Rice should be donated within 1 hour of cooking at room temperature.',
    '🥛 Dairy products lose quality rapidly above 4°C — always keep refrigerated.',
    '🥗 Fruits and vegetables should be washed and kept separate from cooked items.',
    '📅 Label all donations with the preparation time and expiry estimate.',
  ];
  const todayTip = FOOD_TIPS[new Date().getDay() % FOOD_TIPS.length];

  const active = donations.filter(d => ['open','matched'].includes(d.status));
  const history = donations.filter(d => ['delivered','cancelled','expired'].includes(d.status));

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🍱 Donor Dashboard</h2>
          <p className="text-sm text-gray-500">Manage your food donations and find nearby NGOs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setShowNGOPanel(v => !v); if (!showNGOPanel) searchNGOs(); }} className="btn btn-secondary text-sm">
            🗺️ {showNGOPanel ? 'Hide' : 'Find'} NGOs
          </button>
          <button onClick={() => { setShowForm(v => !v); setActiveSection('overview'); }} className={`btn text-sm ${showForm ? 'btn-secondary' : 'btn-primary'}`}>
            {showForm ? '✕ Cancel' : '+ Post Donation'}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { val: stats.total,     label: 'Total Posted',   color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { val: stats.active,    label: 'Active',         color: 'text-green-600',  bg: 'bg-green-50'  },
          { val: stats.matched,   label: 'Matched',        color: 'text-orange-500', bg: 'bg-orange-50' },
          { val: stats.delivered, label: 'Delivered',      color: 'text-purple-600', bg: 'bg-purple-50' },
          { val: stats.meals,     label: 'Est. Meals 🍽️',  color: 'text-pink-600',   bg: 'bg-pink-50'   },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4 text-center border border-white shadow-sm`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Food safety tip ── */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0">💡</span>
        <div>
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Food Safety Tip of the Day</p>
          <p className="text-sm text-gray-700">{todayTip}</p>
        </div>
      </div>

      {/* ── Post form ── */}
      {showForm && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">📝 Post a New Donation</h3>
          <DonationForm onSubmit={async (data) => { const r = await onSubmit(data); if (r?.success) setShowForm(false); return r; }} loading={loading} />
        </div>
      )}

      {/* ── NGO Search Panel ── */}
      {showNGOPanel && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">🤖 AI-Powered NGO Finder</h3>
            <button onClick={() => setShowNGOPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Max Distance (km)</label>
              <input type="number" value={search.maxDistance} onChange={e => setSearch(p => ({ ...p, maxDistance: +e.target.value }))} className="form-input text-sm" min="1" max="100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Food Type</label>
              <select value={search.foodType} onChange={e => setSearch(p => ({ ...p, foodType: e.target.value }))} className="form-input text-sm">
                <option value="">Any</option>
                {['cooked','raw','packaged','fruits','vegetables','dairy','grains'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity (approx.)</label>
              <input type="number" value={search.quantity} onChange={e => setSearch(p => ({ ...p, quantity: e.target.value }))} className="form-input text-sm" placeholder="e.g. 50" />
            </div>
            <div className="sm:col-span-3">
              <button onClick={searchNGOs} disabled={loadingNGOs} className="btn btn-primary w-full text-sm">
                {loadingNGOs ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Searching…</> : '🔍 Search with AI'}
              </button>
            </div>
          </div>

          {aiRec && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-xl p-4 flex gap-3">
              <span className="text-2xl shrink-0">🤖</span>
              <div>
                <p className="text-xs font-bold text-blue-800 mb-1">AI Recommendation</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{aiRec}</p>
              </div>
            </div>
          )}

          {nearbyNGOs.length > 0 && (
            <>
              <MapView points={nearbyNGOs.map(n => ({ lat: n.location.lat, lng: n.location.lng, label: n.name, address: n.location.address, type: 'ngo', info: `${n.distance}km | ${n.matchScore}% match` }))} zoom={12} height="380px" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nearbyNGOs.map(n => (
                  <div key={n.id} className="border rounded-xl p-4 hover:shadow-md transition-all relative bg-white">
                    <span className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{n.matchScore}%</span>
                    <h4 className="font-bold text-blue-700 pr-14 text-sm">{n.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">📍 {n.location.address}</p>
                    <p className="text-xs text-gray-500">📏 {n.distance}km &nbsp;·&nbsp; 👥 {n.capacity?.available ?? '?'} meals avail.</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(n.tags || []).map((tag, i) => <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{tag}</span>)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <a href={`tel:${n.primaryContact?.phone}`} className="btn btn-sm btn-primary text-xs text-center">📞 Call</a>
                      <button onClick={() => alert(`NGO: ${n.name}\nReg: ${n.registrationNumber}\nContact: ${n.primaryContact?.name || 'N/A'}\nPhone: ${n.primaryContact?.phone || 'N/A'}`)} className="btn btn-sm btn-secondary text-xs">ℹ️ Info</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!loadingNGOs && nearbyNGOs.length === 0 && !aiRec && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <p>Click "Search with AI" to find nearby NGOs</p>
            </div>
          )}
        </div>
      )}

      {/* ── Section tabs ── */}
      <div className="flex gap-2 border-b pb-0">
        {[['overview','📊 Overview'], ['history','📜 History'], ['map','🗺️ Map']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSection === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Active Donations</h3>
            <button onClick={onRefresh} className="text-xs text-blue-600 hover:underline">🔄 Refresh</button>
          </div>
          {loading && active.length === 0 && <div className="card text-center py-6"><div className="spinner mx-auto"></div></div>}
          {!loading && active.length === 0 && (
            <div className="card text-center py-10">
              <div className="text-5xl mb-3">🍱</div>
              <p className="font-medium text-gray-600">No active donations yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "+ Post Donation" to share food with NGOs</p>
              <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4 text-sm">+ Post Your First Donation</button>
            </div>
          )}
          {active.map(d => {
            const h = fmt.hoursLeft(d.estimatedShelfLifeEnd);
            return (
              <div key={d._id} className="card border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: d.status === 'matched' ? '#f97316' : '#22c55e' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{d.foodName}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{d.foodType} · {d.quantity} {d.unit} · {d.storageTemp?.replace('_',' ')}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${fmt.statusBadge(d.status)}`}>{fmt.statusLabel(d.status)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600 mb-3">
                  <div><span className="font-semibold block text-gray-500">📍 Location</span>{d.location?.address || '—'}</div>
                  <div><span className="font-semibold block text-gray-500">⏰ Expires</span><span className={fmt.hoursColor(h)}>{h != null ? `${h}h` : 'Unknown'}</span></div>
                  <div><span className="font-semibold block text-gray-500">🚨 Urgency</span><span className="capitalize">{d.urgencyLevel || '—'}</span></div>
                  <div><span className="font-semibold block text-gray-500">📅 Posted</span>{new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                {/* Dietary tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {d.dietaryInfo?.isVegetarian && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">🥦 Veg</span>}
                  {d.dietaryInfo?.isVegan      && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">🌱 Vegan</span>}
                  {d.dietaryInfo?.isHalal      && <span className="px-2 py-0.5 bg-teal-100  text-teal-700  rounded text-xs">☪️ Halal</span>}
                  {d.dietaryInfo?.isKosher     && <span className="px-2 py-0.5 bg-blue-100  text-blue-700  rounded text-xs">✡️ Kosher</span>}
                  {d.dietaryInfo?.isGlutenFree && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">🌾 GF</span>}
                </div>
                {/* Progress indicator */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Posted</span><span>Matched</span><span>Picked up</span><span>Delivered</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${d.status === 'open' ? 'w-1/4 bg-green-500' : d.status === 'matched' ? 'w-2/4 bg-orange-500' : d.status === 'picked_up' ? 'w-3/4 bg-blue-500' : 'w-full bg-purple-500'}`} />
                  </div>
                </div>
                {d.status === 'open' && (
                  <button onClick={() => cancelDonation(d._id)} disabled={cancelLoading[d._id]} className="btn btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50">
                    {cancelLoading[d._id] ? '…' : '✕ Cancel Donation'}
                  </button>
                )}
                {d.pickupInstructions && <p className="text-xs text-gray-400 italic mt-2">📋 {d.pickupInstructions}</p>}
              </div>
            );
          })}

          {/* Impact summary */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-5 text-white">
            <h3 className="font-bold text-lg mb-3">🌍 Your Impact</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-3xl font-bold">{stats.delivered}</div><div className="text-xs opacity-80 mt-1">Donations Delivered</div></div>
              <div><div className="text-3xl font-bold">{stats.meals}</div><div className="text-xs opacity-80 mt-1">Meals Estimated</div></div>
              <div><div className="text-3xl font-bold">{(stats.meals * 0.4).toFixed(0)}kg</div><div className="text-xs opacity-80 mt-1">CO₂ Saved</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {activeSection === 'history' && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Donation History ({history.length})</h3>
          {history.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📜</div>
              <p>No completed or cancelled donations yet</p>
            </div>
          ) : history.map(d => (
            <div key={d._id} className="card flex justify-between items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{d.foodName} <span className="text-gray-400 font-normal">({d.quantity} {d.unit})</span></p>
                <p className="text-xs text-gray-400 mt-0.5">📅 {new Date(d.createdAt).toLocaleString()} · 📍 {d.location?.address}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${fmt.statusBadge(d.status)}`}>{fmt.statusLabel(d.status)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Map ── */}
      {activeSection === 'map' && (
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">📍 My Donation Locations</h3>
          {donations.length === 0 ? (
            <div className="text-center py-8 text-gray-400"><div className="text-4xl mb-2">🗺️</div><p>No donations to show on map</p></div>
          ) : (
            <MapView
              points={donations.map(d => ({ lat: d.location?.lat || 13.085, lng: d.location?.lng || 80.21, label: d.foodName, address: d.location?.address, type: 'donor', info: `${d.quantity} ${d.unit} · ${fmt.statusLabel(d.status)}` }))}
              zoom={12} height="480px"
            />
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🏢 NGO DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const NGOView = ({ donations, loading, onRefresh, ngos }) => {
  const [search,       setSearch]      = useState('');
  const [foodFilter,   setFoodFilter]  = useState('all');
  const [expiryFilter, setExpiryFilter]= useState('all');
  const [showMap,      setShowMap]     = useState(false);
  const [activeSection, setSection]   = useState('available'); // available | requested | partners
  const [reqLoading,   setReqLoading]  = useState({});
  const [toast, showToast] = useToast();

  const filtered = donations
    .filter(d => foodFilter === 'all' || d.foodType === foodFilter)
    .filter(d => !search || d.foodName?.toLowerCase().includes(search.toLowerCase()))
    .filter(d => {
      const h = fmt.hoursLeft(d.estimatedShelfLifeEnd);
      if (expiryFilter === 'critical') return h != null && h <= 3;
      if (expiryFilter === 'urgent')   return h != null && h <= 6;
      if (expiryFilter === 'soon')     return h != null && h <= 24;
      return true;
    });

  const available  = filtered.filter(d => d.status === 'open');
  const requested  = filtered.filter(d => ['matched','picked_up'].includes(d.status));

  const requestPickup = async (id) => {
    setReqLoading(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/donations/${id}/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok) { showToast('success', '✅ Pickup request sent! A volunteer will be assigned.'); onRefresh(); }
      else showToast('error', data.error || 'Request failed');
    } catch { showToast('error', 'Network error'); }
    finally { setReqLoading(p => ({ ...p, [id]: false })); }
  };

  const urgencyIcon = { critical:'🚨', high:'⚡', medium:'⏰', low:'🟢' };

  const DonationCard = ({ d, showRequest = false }) => {
    const h = fmt.hoursLeft(d.estimatedShelfLifeEnd);
    return (
      <div className={`card border-l-4 hover:shadow-md transition-all ${h != null && h <= 4 ? 'border-red-400' : h != null && h <= 12 ? 'border-orange-400' : 'border-green-400'}`}>
        <div className="flex justify-between items-start mb-2 gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-gray-800">{d.foodName}</h4>
              <span className="text-sm">{urgencyIcon[d.urgencyLevel] || '⏰'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${fmt.statusBadge(d.status)}`}>{fmt.statusLabel(d.status)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{d.foodType} · {d.quantity} {d.unit}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-green-600">{Math.min(98, 80 + (d.dietaryInfo?.isVegetarian ? 5 : 0) + (d.quantity >= 20 ? 8 : 0) + (h > 12 ? 5 : 0))}%</div>
            <div className="text-xs text-gray-400">match</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
          <div><span className="block text-gray-400 font-semibold">📍 Location</span>{d.location?.address || '—'}</div>
          <div><span className="block text-gray-400 font-semibold">⏰ Expires</span><span className={fmt.hoursColor(h)}>{h != null ? `${h}h` : '—'}</span></div>
          <div><span className="block text-gray-400 font-semibold">🌡️ Storage</span><span className="capitalize">{d.storageTemp?.replace('_',' ')}</span></div>
          {d.contactPerson && <div><span className="block text-gray-400 font-semibold">👤 Donor</span>{d.contactPerson}</div>}
          {d.contactPhone  && <div><span className="block text-gray-400 font-semibold">📞 Phone</span><a href={`tel:${d.contactPhone}`} className="text-blue-600 underline">{d.contactPhone}</a></div>}
          <div><span className="block text-gray-400 font-semibold">📅 Posted</span>{new Date(d.createdAt).toLocaleDateString()}</div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {d.dietaryInfo?.isVegetarian && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">🥦 Veg</span>}
          {d.dietaryInfo?.isVegan      && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">🌱 Vegan</span>}
          {d.dietaryInfo?.isHalal      && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">☪️ Halal</span>}
          {d.dietaryInfo?.isGlutenFree && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">🌾 GF</span>}
        </div>

        {/* Why this matches */}
        <div className="bg-gray-50 rounded-lg p-2 mb-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">Why this matches your NGO:</p>
          <p>✓ Sufficient quantity for your daily capacity</p>
          {d.dietaryInfo?.isVegetarian && <p>✓ Vegetarian — compatible with your dietary needs</p>}
          {h != null && h > 6 && <p>✓ Enough time for safe distribution</p>}
          {d.location?.address && <p>✓ Pickup available at {d.location.address}</p>}
        </div>

        {showRequest && d.status === 'open' && (
          <button onClick={() => requestPickup(d._id)} disabled={reqLoading[d._id]} className="btn btn-primary w-full text-sm">
            {reqLoading[d._id] ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Requesting…</> : '🚚 Request Pickup'}
          </button>
        )}
        {d.status !== 'open' && (
          <div className={`text-center py-2 rounded-lg text-sm font-medium ${fmt.statusBadge(d.status)}`}>
            {d.status === 'matched' ? '🔄 Volunteer being assigned' : d.status === 'picked_up' ? '🚚 In transit to your NGO' : fmt.statusLabel(d.status)}
          </div>
        )}
        {d.pickupInstructions && <p className="text-xs text-gray-400 italic mt-2">📋 {d.pickupInstructions}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏢 NGO Dashboard</h2>
          <p className="text-sm text-gray-500">Browse donations and coordinate pickups</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="btn btn-secondary text-sm">🔄 Refresh</button>
          <button onClick={() => setShowMap(v => !v)} className="btn btn-secondary text-sm">{showMap ? '📋 List' : '🗺️ Map'}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { val: available.length,  label: 'Available Now',    color: 'text-green-600',  bg: 'bg-green-50' },
          { val: donations.filter(d=>d.urgencyLevel==='critical'&&d.status==='open').length, label: '🚨 Critical', color: 'text-red-600', bg: 'bg-red-50' },
          { val: requested.length,  label: 'In Progress',      color: 'text-blue-600',   bg: 'bg-blue-50'  },
          { val: donations.filter(d=>d.status==='delivered').length, label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4 text-center shadow-sm border border-white`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgency alert banner */}
      {donations.filter(d => d.status === 'open' && fmt.hoursLeft(d.estimatedShelfLifeEnd) <= 3).length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-3xl">🚨</span>
          <div>
            <p className="font-bold text-red-800">Urgent Action Required!</p>
            <p className="text-sm text-red-700">{donations.filter(d => d.status === 'open' && fmt.hoursLeft(d.estimatedShelfLifeEnd) <= 3).length} donation(s) expire within 3 hours. Request pickup immediately to avoid food waste.</p>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search food name…" className="form-input text-sm sm:col-span-1" />
          <select value={foodFilter} onChange={e => setFoodFilter(e.target.value)} className="form-input text-sm">
            <option value="all">All Food Types</option>
            {['cooked','raw','packaged','fruits','vegetables','dairy','grains'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} className="form-input text-sm">
            <option value="all">All Expiry Times</option>
            <option value="critical">🚨 Critical (≤3h)</option>
            <option value="urgent">⚡ Urgent (≤6h)</option>
            <option value="soon">⏰ Soon (≤24h)</option>
          </select>
        </div>
        <p className="text-xs text-gray-500">Showing <strong>{filtered.length}</strong> of <strong>{donations.length}</strong> donations</p>
      </div>

      {/* Map */}
      {showMap && filtered.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">📍 Donation Locations</h3>
          <MapView points={filtered.map(d => ({ lat: d.location?.lat||13.085, lng: d.location?.lng||80.21, label: d.foodName, address: d.location?.address, type: 'donor', info: `${d.quantity} ${d.unit} · ${fmt.hoursLeft(d.estimatedShelfLifeEnd)}h left` }))} zoom={12} height="450px" />
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-0 border-b">
        {[['available',`🟢 Available (${available.length})`],['requested',`🔄 In Progress (${requested.length})`],['partners',`🤝 Partner NGOs (${ngos.length})`]].map(([id,label]) => (
          <button key={id} onClick={() => setSection(id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeSection===id?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {/* Available donations */}
      {activeSection === 'available' && (
        <div className="space-y-4">
          {loading && available.length === 0 && <div className="card text-center py-8"><div className="spinner mx-auto"></div></div>}
          {!loading && available.length === 0 && (
            <div className="card text-center py-10">
              <div className="text-5xl mb-3">🍱</div>
              <p className="font-medium text-gray-600">No donations available right now</p>
              <p className="text-sm text-gray-400 mt-1">Check back soon — new donations are posted throughout the day</p>
            </div>
          )}
          {available.map(d => <DonationCard key={d._id} d={d} showRequest />)}
        </div>
      )}

      {/* In-progress */}
      {activeSection === 'requested' && (
        <div className="space-y-4">
          {requested.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-5xl mb-3">🔄</div>
              <p className="font-medium text-gray-600">No in-progress pickups</p>
              <p className="text-sm text-gray-400 mt-1">Requested pickups will appear here</p>
            </div>
          ) : requested.map(d => <DonationCard key={d._id} d={d} />)}
        </div>
      )}

      {/* Partner NGOs */}
      {activeSection === 'partners' && (
        <div className="space-y-4">
          {ngos.length === 0 ? (
            <div className="card text-center py-8 text-gray-400"><div className="text-4xl mb-2">🏢</div><p>No partner NGOs found</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ngos.map(n => (
                <div key={n._id} className="card hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 text-sm">{n.organizationName}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${n.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {n.verificationStatus === 'verified' ? '✓ Verified' : '⏳ Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">📍 {n.userId?.location?.address || 'Address N/A'}</p>
                  <div className="mt-2 flex justify-between text-xs text-gray-600">
                    <span>👥 {n.capacity?.daily || '?'} meals/day</span>
                    <span>⭐ {n.rating?.average?.toFixed(1) || '—'} ({n.rating?.count || 0})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.max(0, 100 - ((n.capacity?.current||0)/(n.capacity?.daily||1))*100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{Math.max(0, (n.capacity?.daily||0)-(n.capacity?.current||0))} meals capacity available</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(n.dietaryNeeds||[]).slice(0,3).map((d,i) => <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs capitalize">{d}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🚚 VOLUNTEER DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const VolunteerView = ({ user, donations = [], loading, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState({});
  const [toast, showToast] = useToast();
  const [showMap,      setShowMap]      = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSection, setSection]    = useState('pickups'); // pickups | history | stats

  const myId    = user?._id?.toString();
  const volIdOf = (d) => !d.volunteerId ? null : typeof d.volunteerId === 'object' ? d.volunteerId._id?.toString() : d.volunteerId.toString();
  const isMine  = (d) => volIdOf(d) === myId;

  const classify = (d) => {
    if (d.status === 'open')      return 'available';
    if (d.status === 'matched'    && isMine(d)) return 'accepted';
    if (d.status === 'picked_up'  && isMine(d)) return 'in_transit';
    if (d.status === 'delivered'  && isMine(d)) return 'done';
    if (d.status === 'matched'    && !isMine(d)) return 'taken';
    return d.status;
  };

  const filtered = donations.filter(d => {
    const cs = classify(d);
    if (activeFilter === 'available') return cs === 'available';
    if (activeFilter === 'mine')      return ['accepted','in_transit'].includes(cs);
    if (activeFilter === 'completed') return cs === 'done';
    return cs !== 'taken';
  });

  const stats = {
    available:   donations.filter(d => d.status === 'open').length,
    accepted:    donations.filter(d => d.status === 'matched'   && isMine(d)).length,
    inTransit:   donations.filter(d => d.status === 'picked_up' && isMine(d)).length,
    done:        donations.filter(d => d.status === 'delivered' && isMine(d)).length,
    mealsSaved:  donations.filter(d => d.status === 'delivered' && isMine(d)).reduce((s, d) => s + Math.ceil((d.quantity||0) * (d.unit === 'kg' ? 4 : 1)), 0),
    critical:    donations.filter(d => d.status === 'open' && d.urgencyLevel === 'critical').length,
  };

  const callApi = async (donationId, endpoint) => {
    setActionLoading(p => ({ ...p, [donationId]: endpoint }));
    try {
      const res = await fetch(`/api/donations/${donationId}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: '{}' });
      const data = await res.json();
      if (res.ok && data.success) { showToast('success', data.message); await onRefresh(); }
      else showToast('error', data.error || `Failed (${res.status})`);
    } catch { showToast('error', 'Network error'); }
    finally { setActionLoading(p => ({ ...p, [donationId]: null })); }
  };

  const URGENCY = {
    critical: { pill: 'bg-red-100 text-red-800 border border-red-300',    bar: 'w-full bg-red-500' },
    high:     { pill: 'bg-orange-100 text-orange-800 border border-orange-300', bar: 'w-3/4 bg-orange-500' },
    medium:   { pill: 'bg-yellow-100 text-yellow-800 border border-yellow-300', bar: 'w-2/4 bg-yellow-500' },
    low:      { pill: 'bg-green-100 text-green-800 border border-green-300',   bar: 'w-1/4 bg-green-500' },
  };
  const CS_STYLE = {
    available:  { pill: 'bg-blue-100 text-blue-800',   border: 'border-blue-400'   },
    accepted:   { pill: 'bg-orange-100 text-orange-800', border: 'border-orange-400' },
    in_transit: { pill: 'bg-purple-100 text-purple-800', border: 'border-purple-400' },
    done:       { pill: 'bg-gray-100 text-gray-600',   border: 'border-green-400'  },
    taken:      { pill: 'bg-gray-100 text-gray-400',   border: 'border-gray-200'   },
  };
  const CS_LABEL = { available:'🔵 Available', accepted:'🟠 Accepted', in_transit:'🟣 In Transit', done:'✅ Delivered', taken:'⚫ Taken' };

  const history = donations.filter(d => d.status === 'delivered' && isMine(d));

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🚚 Volunteer Dashboard</h2>
          <p className="text-sm text-gray-500">Welcome back, {user?.name} · Help rescue food today!</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} disabled={loading} className="btn btn-secondary text-sm">{loading ? '⏳' : '🔄'} Refresh</button>
          <button onClick={() => setShowMap(v => !v)} className="btn btn-secondary text-sm">{showMap ? '📋 List' : '🗺️ Map'}</button>
        </div>
      </div>

      {/* Stat cards (clickable filters) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Available',  val: stats.available,  color: 'text-blue-600',   bg: 'bg-blue-50',   filter: 'available' },
          { label: 'Accepted',   val: stats.accepted,   color: 'text-orange-500', bg: 'bg-orange-50', filter: 'mine' },
          { label: 'In Transit', val: stats.inTransit,  color: 'text-purple-600', bg: 'bg-purple-50', filter: 'mine' },
          { label: 'Delivered',  val: stats.done,       color: 'text-green-600',  bg: 'bg-green-50',  filter: 'completed' },
        ].map(s => (
          <button key={s.label} onClick={() => setActiveFilter(activeFilter === s.filter ? 'all' : s.filter)}
            className={`${s.bg} rounded-xl p-4 text-center cursor-pointer hover:shadow-md transition-all border-2 ${activeFilter === s.filter ? 'border-blue-400 shadow-md' : 'border-transparent'}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-600 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Critical alert */}
      {stats.critical > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <span className="text-3xl">🚨</span>
          <div>
            <p className="font-bold text-red-800">{stats.critical} Critical Pickup{stats.critical > 1 ? 's' : ''} — Act Now!</p>
            <p className="text-sm text-red-600">Food expiring in under 2 hours. Every minute counts!</p>
          </div>
          <button onClick={() => setActiveFilter('available')} className="ml-auto btn text-xs bg-red-600 text-white hover:bg-red-700">View →</button>
        </div>
      )}

      {/* Quick impact banner */}
      {stats.done > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-4 text-white flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div className="flex-1">
            <p className="font-bold text-lg">Your Impact So Far</p>
            <p className="text-sm opacity-90">{stats.done} deliveries · {stats.mealsSaved} meals saved · {(stats.mealsSaved * 0.4).toFixed(0)} kg CO₂ reduced</p>
          </div>
          <button onClick={() => setSection('stats')} className="text-xs bg-white text-purple-700 font-semibold px-3 py-1.5 rounded-full">Details →</button>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-0 border-b">
        {[['pickups','🚚 Pickups'],['history','📜 History'],['stats','📊 My Stats']].map(([id,label]) => (
          <button key={id} onClick={() => setSection(id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeSection===id?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {/* ── PICKUPS section ── */}
      {activeSection === 'pickups' && (
        <div className="space-y-5">
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap items-center">
            {[['all','📋 All Active'],['available','🔵 Available'],['mine','🚚 My Pickups'],['completed','✅ Completed']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveFilter(id)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeFilter===id?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{label}</button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{filtered.length} donation{filtered.length!==1?'s':''}</span>
          </div>

          {/* Map */}
          {showMap && filtered.length > 0 && (
            <div className="card">
              <h3 className="font-bold mb-3">📍 Pickup Locations</h3>
              <MapView points={filtered.map(d => ({ lat:d.location?.lat||13.085, lng:d.location?.lng||80.21, label:d.foodName, address:d.location?.address, type:isMine(d)?'volunteer':'donor', info:`${d.quantity} ${d.unit} · ${classify(d)}` }))} zoom={12} height="420px" />
              <p className="text-xs text-gray-400 mt-2 text-center">🟠 Orange = your pickups &nbsp;|&nbsp; 🟢 Green = available</p>
            </div>
          )}

          {/* Cards */}
          {loading && filtered.length === 0 && <div className="card text-center py-10"><div className="spinner mx-auto mb-3"></div><p className="text-gray-500">Loading…</p></div>}
          {!loading && filtered.length === 0 && (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">🚚</div>
              <p className="font-medium text-gray-700">{activeFilter==='available'?'No available pickups right now':activeFilter==='mine'?'You have no active pickups':activeFilter==='completed'?'No completed deliveries yet':'No pickups to show'}</p>
              <p className="text-sm text-gray-400 mt-1">{activeFilter!=='all'?'Try "All Active" filter':'Check back later for new food donations'}</p>
              <button onClick={onRefresh} className="btn btn-primary mt-4 text-sm">🔄 Refresh Now</button>
            </div>
          )}

          {filtered.map(d => {
            const cs      = classify(d);
            const urgency = d.urgencyLevel || 'medium';
            const isLoad  = actionLoading[d._id];
            const h       = fmt.hoursLeft(d.estimatedShelfLifeEnd);

            return (
              <div key={d._id} className={`card border-l-4 hover:shadow-md transition-all ${CS_STYLE[cs]?.border || 'border-gray-300'} ${cs === 'taken' ? 'opacity-50' : ''}`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">{d.foodName}</h4>
                    <p className="text-sm text-gray-500 capitalize">{d.foodType} · {d.quantity} {d.unit}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${URGENCY[urgency]?.pill || URGENCY.medium.pill}`}>{urgency.toUpperCase()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${CS_STYLE[cs]?.pill || 'bg-gray-100 text-gray-600'}`}>{CS_LABEL[cs] || cs}</span>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                  <div className="flex items-start gap-2"><span className="shrink-0 text-gray-400">📍</span><span className="text-gray-700">{d.location?.address || 'Not specified'}</span></div>
                  <div className="flex items-center gap-2"><span className="text-gray-400">⏰</span><span className={fmt.hoursColor(h)}>{h!=null?(h>0?`${h}h until expiry`:'Expired'):'Unknown'}</span></div>
                  {d.contactPerson && <div className="flex items-center gap-2"><span className="text-gray-400">👤</span><span className="text-gray-700">{d.contactPerson}</span></div>}
                  {d.contactPhone  && <div className="flex items-center gap-2"><span className="text-gray-400">📞</span><a href={`tel:${d.contactPhone}`} className="text-blue-600 underline">{d.contactPhone}</a></div>}
                  <div className="flex items-center gap-2"><span className="text-gray-400">🌡️</span><span className="text-gray-700 capitalize">{d.storageTemp?.replace('_',' ')}</span></div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.dietaryInfo?.isVegetarian && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Veg</span>}
                    {d.dietaryInfo?.isHalal      && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">Halal</span>}
                  </div>
                  {d.pickupInstructions && <div className="sm:col-span-2 flex items-start gap-2"><span className="text-gray-400">📋</span><span className="text-gray-500 italic text-xs">{d.pickupInstructions}</span></div>}
                </div>

                {/* Progress bar */}
                {cs !== 'taken' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Available</span><span>Accepted</span><span>Picked Up</span><span>Delivered</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-700 ${cs==='available'?'w-1/4 bg-blue-500':cs==='accepted'?'w-2/4 bg-orange-500':cs==='in_transit'?'w-3/4 bg-purple-500':'w-full bg-green-500'}`} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  {cs === 'available' && (
                    <button onClick={() => callApi(d._id,'accept')} disabled={!!isLoad} className="btn btn-primary flex-1 text-sm">
                      {isLoad==='accept'?<><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Accepting…</>:'✋ Accept Pickup'}
                    </button>
                  )}
                  {cs === 'accepted' && (
                    <>
                      <button onClick={() => callApi(d._id,'pickup')} disabled={!!isLoad} className="btn btn-success flex-1 text-sm">
                        {isLoad==='pickup'?<><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Updating…</>:'🚚 I Have Picked It Up'}
                      </button>
                      {d.contactPhone && <a href={`tel:${d.contactPhone}`} className="btn btn-secondary text-sm px-4">📞 Call</a>}
                    </>
                  )}
                  {cs === 'in_transit' && (
                    <button onClick={() => callApi(d._id,'deliver')} disabled={!!isLoad} className="btn btn-success flex-1 text-sm">
                      {isLoad==='deliver'?<><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Updating…</>:'📦 Mark as Delivered to NGO'}
                    </button>
                  )}
                  {cs === 'done' && (
                    <div className="flex-1 text-center py-2 bg-green-50 rounded-lg text-green-700 text-sm font-semibold">
                      🎉 Delivered! {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString() : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* How it works */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-bold text-blue-900 mb-4">🔖 How Pickup Works</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['1','🔵','Accept','Click "Accept Pickup" on any available donation'],['2','🟠','Collect','Go to the pickup address and collect the food'],['3','🟣','Confirm','Click "I Have Picked It Up" once you have it'],['4','✅','Deliver','Bring food to NGO and click "Mark as Delivered"']].map(([step,icon,title,desc]) => (
                <div key={step} className="bg-white rounded-xl p-3 text-center border border-blue-100 shadow-sm">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="font-semibold text-gray-800 text-sm">Step {step}: {title}</div>
                  <div className="text-gray-500 text-xs mt-1">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY section ── */}
      {activeSection === 'history' && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Completed Deliveries ({history.length})</h3>
          {history.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-5xl mb-3">📜</div>
              <p className="font-medium text-gray-600">No completed deliveries yet</p>
              <p className="text-sm text-gray-400 mt-1">Start accepting pickups to build your history</p>
            </div>
          ) : history.map(d => (
            <div key={d._id} className="card flex justify-between items-center gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-800">{d.foodName} <span className="font-normal text-gray-400">({d.quantity} {d.unit})</span></p>
                <p className="text-xs text-gray-400 mt-0.5">📍 {d.location?.address} &nbsp;·&nbsp; 📅 {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : 'N/A'}</p>
                <p className="text-xs text-green-600 mt-0.5">🍽️ ~{Math.ceil((d.quantity||0)*(d.unit==='kg'?4:1))} meals saved</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold shrink-0">✅ Delivered</span>
            </div>
          ))}
        </div>
      )}

      {/* ── STATS section ── */}
      {activeSection === 'stats' && (
        <div className="space-y-5">
          <h3 className="font-bold text-gray-800">📊 Your Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon:'🚚', val: stats.done,       label: 'Total Deliveries',    color: 'text-blue-600' },
              { icon:'🍽️', val: stats.mealsSaved, label: 'Estimated Meals Saved', color: 'text-green-600' },
              { icon:'🌍', val: `${(stats.mealsSaved*0.4).toFixed(1)}kg`, label: 'CO₂ Saved', color: 'text-teal-600' },
              { icon:'⚡', val: donations.filter(d=>d.status==='delivered'&&isMine(d)&&d.urgencyLevel==='critical').length, label: 'Critical Saves', color: 'text-red-600' },
              { icon:'📅', val: stats.done > 0 ? new Date(donations.filter(d=>d.status==='delivered'&&isMine(d)).sort((a,b)=>new Date(b.deliveredAt)-new Date(a.deliveredAt))[0]?.deliveredAt).toLocaleDateString() : '—', label: 'Last Delivery', color: 'text-purple-600' },
              { icon:'🏅', val: stats.done >= 10 ? 'Gold' : stats.done >= 5 ? 'Silver' : stats.done >= 1 ? 'Bronze' : 'Starter', label: 'Badge Level', color: 'text-yellow-600' },
            ].map((s, i) => (
              <div key={i} className="card text-center">
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Badge progress */}
          <div className="card">
            <h4 className="font-bold text-gray-800 mb-3">🏅 Badge Progress</h4>
            <div className="space-y-3">
              {[['🥉 Bronze','1 delivery',1],['🥈 Silver','5 deliveries',5],['🥇 Gold','10 deliveries',10],['💎 Diamond','25 deliveries',25]].map(([badge,req,needed]) => (
                <div key={badge}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{badge}</span>
                    <span className="text-gray-500">{Math.min(stats.done,needed)}/{needed} {req}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all" style={{ width:`${Math.min(100,(stats.done/needed)*100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational message */}
          <div className="bg-gradient-to-r from-green-400 to-teal-500 rounded-2xl p-5 text-white text-center">
            <div className="text-4xl mb-2">🌟</div>
            <p className="font-bold text-lg">{stats.done === 0 ? 'Ready to make a difference?' : stats.done < 5 ? 'Great start! Keep going!' : stats.done < 10 ? 'You\'re a food rescue hero!' : 'Outstanding! You\'re a ResQ-AI champion!'}</p>
            <p className="text-sm opacity-90 mt-1">{stats.done === 0 ? 'Accept your first pickup and start saving food today.' : `You've saved approximately ${stats.mealsSaved} meals from going to waste. Thank you!`}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 👤 ADMIN VIEW
// ═══════════════════════════════════════════════════════════════════
const AdminView = ({ donations, ngos, loading, onRefresh }) => {
  const stats = {
    total:     donations.length,
    open:      donations.filter(d => d.status === 'open').length,
    matched:   donations.filter(d => d.status === 'matched').length,
    delivered: donations.filter(d => d.status === 'delivered').length,
    totalNGOs: ngos.length,
    verified:  ngos.filter(n => n.verificationStatus === 'verified').length,
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">👤 Admin Dashboard</h2>
        <button onClick={onRefresh} className="btn btn-secondary text-sm">🔄 Refresh</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { val:stats.total,     label:'Total Donations',  color:'text-blue-600',   bg:'bg-blue-50'   },
          { val:stats.open,      label:'Open / Available', color:'text-green-600',  bg:'bg-green-50'  },
          { val:stats.matched,   label:'Matched',          color:'text-orange-500', bg:'bg-orange-50' },
          { val:stats.delivered, label:'Delivered',        color:'text-gray-600',   bg:'bg-gray-50'   },
          { val:stats.totalNGOs, label:'Total NGOs',       color:'text-purple-600', bg:'bg-purple-50' },
          { val:stats.verified,  label:'Verified NGOs',    color:'text-green-600',  bg:'bg-green-50'  },
        ].map((s,i) => (
          <div key={i} className={`${s.bg} rounded-xl p-5 text-center shadow-sm`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-sm text-gray-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Recent Donations</h3>
          {donations.slice(0,8).map(d => (
            <div key={d._id} className="flex justify-between items-center py-2.5 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{d.foodName}</p>
                <p className="text-xs text-gray-400">{d.location?.address} · {new Date(d.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${fmt.statusBadge(d.status)}`}>{fmt.statusLabel(d.status)}</span>
            </div>
          ))}
          {donations.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No donations yet</p>}
        </div>
        <div className="card">
          <h3 className="text-lg font-bold mb-4">System Health</h3>
          <div className="space-y-3">
            {[['🟢','API Server','Online'],['🟢','Database','Connected'],['🟢','AI / RAG','Active'],['🟢','MCP Services','Running'],['🟡','Gemini AI', 'Limited (no API key)']].map(([icon,name,status]) => (
              <div key={name} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="flex items-center gap-2"><span>{icon}</span><span className="text-sm font-medium">{name}</span></div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${status==='Online'||status==='Connected'||status==='Active'||status==='Running'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p className="font-semibold mb-1">ℹ️ About the database</p>
            <p>Using in-memory MongoDB — data resets on server restart. Add MONGODB_URI in server/.env for persistence.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🤖 CHAT ASSISTANT
// ═══════════════════════════════════════════════════════════════════
const ChatAssistant = ({ user }) => {
  const [messages, setMessages] = useState([{
    id: 1, type: 'assistant',
    content: "Hello! I'm ResQ-AI Assistant 🤖\n\nI can help you with:\n• 🌤️ Weather conditions for safe food delivery\n• 🗺️ Route optimization for pickups\n• 📅 Available pickup time slots\n• 🍱 Food safety guidelines (FSSAI/WHO)\n\nWhat would you like to know?"
  }]);
  const [input, setInput]           = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || chatLoading) return;
    const query = input.trim();
    setMessages(p => [...p, { id: Date.now(), type: 'user', content: query }]);
    setInput(''); setChatLoading(true);
    try {
      const mcpQuery = detectMCP(query);
      if (mcpQuery) {
        const reply = await handleMCP(mcpQuery);
        setMessages(p => [...p, { id: Date.now()+1, type:'assistant', content:reply, mcpTool:mcpQuery.tool }]);
      } else {
        const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('token')}`}, body: JSON.stringify({ question: query }) });
        const data = await res.json();
        const reply = data.success ? (data.data?.answer || 'No answer returned.') : (data.error || 'Could not process that question.');
        setMessages(p => [...p, { id:Date.now()+1, type:'assistant', content:reply, sources:data.data?.sources||[] }]);
      }
    } catch { setMessages(p => [...p, { id:Date.now()+1, type:'assistant', content:'Error processing your request. Please try again.' }]); }
    finally { setChatLoading(false); }
  };

  const detectMCP = (q) => {
    const l = q.toLowerCase();
    if (l.includes('weather')||l.includes('rain')||l.includes('temperature')) return { tool:'weather', query:q };
    if (l.includes('route')||l.includes('distance')||l.includes('optim')) return { tool:'maps', query:q };
    if (l.includes('schedule')||l.includes('slot')||l.includes('calendar')) return { tool:'calendar', query:q };
    return null;
  };

  const handleMCP = async (q) => {
    try {
      const token = localStorage.getItem('token');
      let url, body, method = 'POST';
      if (q.tool === 'weather') { url='/api/mcp/weather/current'; body={location:'Anna Nagar, Chennai',units:'celsius'}; }
      else if (q.tool === 'maps') {
        if (q.query.toLowerCase().includes('distance')) { url='/api/mcp/maps/distance'; body={origin:'Anna Nagar, Chennai',destination:'T Nagar, Chennai'}; }
        else { url='/api/mcp/maps/optimize'; body={startLocation:'Anna Nagar, Chennai',destinations:['T Nagar, Chennai','Velachery, Chennai','Adyar, Chennai'],vehicleType:'car'}; }
      } else { url=`/api/mcp/calendar/slots/${new Date().toISOString().split('T')[0]}`; method='GET'; }
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, ...(body&&{body:JSON.stringify(body)}) });
      const data = await res.json();
      if (data.success) return fmtMCP(q.tool, data.result);
      return `Issue with ${q.tool}: ${data.error}`;
    } catch { return `Could not reach ${q.tool} service.`; }
  };

  const fmtMCP = (tool, r) => {
    if (!r) return 'No data.';
    if (tool==='weather') return `🌤️ Weather — ${r.location}\n🌡️ ${r.temperature}${r.units} · ${r.condition}\n💨 Wind: ${r.windSpeed}km/h · 💧 Humidity: ${r.humidity}%\n\nDelivery: ${r.deliverySuitability?.rating?.toUpperCase()}${r.deliverySuitability?.issues?.length?'\n⚠️ '+r.deliverySuitability.issues.join(', '):'\n✅ Good conditions'}`;
    if (tool==='maps') return r.distance!==undefined&&r.origin ? `📏 Distance\nFrom: ${r.origin.address}\nTo: ${r.destination.address}\nDistance: ${r.distance}km · Est. ${r.estimatedTime}min` : `🗺️ Route\nTotal: ${r.totalDistance?.toFixed(1)}km · ${r.totalTime}min\n${r.savings}\n${r.optimizedRoute?.map((s,i)=>`${i+1}. ${s.address} (${s.distance}km)`).join('\n')||''}`;
    if (tool==='calendar') { const a=(r.slots||[]).filter(s=>s.available); return `📅 Slots — ${r.date}\n${a.length}/${r.totalSlots} available\n${a.slice(0,6).map(s=>`• ${s.timeDisplay}`).join('\n')}`; }
    return JSON.stringify(r, null, 2);
  };

  const QUICK = ["What's the weather for deliveries?","Optimize route for multiple pickups","Food safety for cooked rice","Available pickup slots today","How long can dairy stay unrefrigerated?","Distance from Anna Nagar to T Nagar"];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">🤖 AI Assistant</h2>

      <div className="card flex flex-col" style={{ height:500 }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.type==='user'?'justify-end':'justify-start'}`}>
              <div className={`max-w-sm lg:max-w-lg px-4 py-2.5 rounded-2xl whitespace-pre-wrap text-sm ${m.type==='user'?'bg-blue-600 text-white rounded-br-sm':'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                {m.content}
                {m.mcpTool && <p className="text-xs mt-1 opacity-50">🔧 via {m.mcpTool} service</p>}
                {m.sources?.length>0 && <p className="text-xs mt-1 opacity-50">📚 {m.sources.map(s=>s.title).join(', ')}</p>}
              </div>
            </div>
          ))}
          {chatLoading && <div className="flex justify-start"><div className="bg-gray-100 px-4 py-2.5 rounded-2xl"><div className="typing-indicator"><span></span><span></span><span></span></div></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t p-3">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Ask about food safety, weather, routes…" className="flex-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" disabled={chatLoading} />
            <button onClick={send} disabled={chatLoading||!input.trim()} className="btn btn-primary text-sm px-4 rounded-xl">Send</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-gray-800 mb-3">⚡ Quick Questions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK.map((q,i) => <button key={i} onClick={()=>setInput(q)} disabled={chatLoading} className="text-left p-2.5 text-sm bg-gray-50 hover:bg-gray-100 rounded-xl border hover:border-blue-300 transition-colors">{q}</button>)}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-gray-800 mb-3">🔧 Connected Services</h3>
        <div className="grid grid-cols-3 gap-3">
          {[['🗺️','Maps & Routes','Distance + route optimization'],['🌤️','Weather','Conditions + delivery safety'],['📅','Calendar','Pickup slots + scheduling']].map(([icon,name,desc])=>(
            <div key={name} className="text-center p-3 bg-gradient-to-b from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-bold text-gray-700">{name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
