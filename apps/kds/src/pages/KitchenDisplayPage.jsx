import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Loader2, Bell, CheckCircle2, AlertTriangle, Volume2, VolumeX,
  RefreshCw, Clock, UtensilsCrossed, CheckSquare, Square, RotateCcw,
  Maximize2, Minimize2, Plus, Sparkles, Filter, ChevronRight,
  Flame, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { subscribeToLiveStream } from '@cafe/shared';
import { useTenant } from '../context/TenantContext';
import { getSampleOrders } from '../data/sampleOrders';

const STATIONS = ['ALL', 'KITCHEN', 'BAR', 'BAKERY', 'DESSERT'];
const STATUS_LABEL = {
  pending: 'Received',
  confirmed: 'Queued',
  preparing: 'Cooking',
  ready: 'Ready',
  completed: 'Served',
  cancelled: 'Cancelled',
};

// Web Audio API chimes for kitchen audio cues
const playSound = (type) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const sounds = {
      'new-order': { freq: 880, duration: 0.45, gain: 0.16 },
      'confirm': { freq: 660, duration: 0.3, gain: 0.12 },
      'ready': { freq: 784, duration: 0.4, gain: 0.14 },
      'complete': { freq: 1046, duration: 0.5, gain: 0.18 },
      'delayed': { freq: 440, duration: 0.6, gain: 0.22 },
    };

    const sound = sounds[type] || sounds['new-order'];
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = sound.freq;
    gain.gain.setValueAtTime(sound.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sound.duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + sound.duration);
  } catch (_err) {
    // Audio is best-effort
  }
};

export default function KitchenDisplayPage() {
  const tenant = useTenant();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('kds_audio_enabled') !== 'false';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [viewFilter, setViewFilter] = useState('active'); // 'active' | 'ready' | 'history'
  const [checkedItems, setCheckedItems] = useState({});
  const [now, setNow] = useState(Date.now());
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const unsubRef = useRef(null);

  // Update clock every second for precise real-time preparation timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleAudio = () => {
    setAudioEnabled(prev => {
      const next = !prev;
      localStorage.setItem('kds_audio_enabled', String(next));
      if (next) playSound('new-order');
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const mergeOrder = (incoming) => setOrders((current) => {
    const exists = current.some((order) => String(order._id) === String(incoming._id));
    return exists
      ? current.map((order) => String(order._id) === String(incoming._id) ? { ...order, ...incoming } : order)
      : [incoming, ...current];
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '250');
      const { data } = await api.get(`/orders?${params.toString()}`);
      if (data?.orders && data.orders.length > 0) {
        setOrders(data.orders);
      } else {
        setOrders(getSampleOrders());
      }
    } catch {
      setOrders(getSampleOrders());
    } finally {
      setLoading(false);
    }
  };

  // Add a test simulated kitchen ticket
  const addSimulatedOrder = () => {
    const sampleItemsPool = [
      {
        name: 'Tiramisu Classico',
        description: 'Classic Italian dessert with coffee and mascarpone.',
        quantity: 1,
        kitchenStation: 'DESSERT',
        specialInstructions: 'Dust with cocoa powder'
      },
      {
        name: 'Artisan Flat White',
        description: 'Double ristretto with steamed silky oat milk.',
        quantity: 2,
        kitchenStation: 'BAR',
        variant: { name: 'Oat Milk' },
        specialInstructions: 'Extra hot'
      },
      {
        name: 'Avocado Sourdough Toast',
        description: 'Toasted artisan sourdough with Hass avocado and feta.',
        quantity: 1,
        kitchenStation: 'KITCHEN',
        specialInstructions: 'Poached egg soft runny yolk'
      },
      {
        name: 'Truffle Mushroom Croissant',
        description: 'Flaky butter croissant filled with wild mushrooms.',
        quantity: 1,
        kitchenStation: 'BAKERY',
        specialInstructions: 'Warm toasted crisp'
      },
      {
        name: 'Margherita Sourdough Pizza',
        description: 'San Marzano tomatoes, fresh mozzarella and sweet basil.',
        quantity: 1,
        kitchenStation: 'KITCHEN',
        specialInstructions: 'Extra basil'
      },
      {
        name: 'Kyoto Ceremonial Matcha',
        description: 'Japanese ceremonial grade matcha tonic.',
        quantity: 1,
        kitchenStation: 'BAR',
        specialInstructions: ''
      },
    ];

    const randomItems = [];
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      randomItems.push(sampleItemsPool[Math.floor(Math.random() * sampleItemsPool.length)]);
    }

    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const tableOptions = [1, 2, 3, 4, 5, 6, 7, 8, null];
    const pickedTable = tableOptions[Math.floor(Math.random() * tableOptions.length)];

    const newTicket = {
      _id: `ticket_live_${Date.now()}`,
      orderNumber: nextNum,
      orderType: pickedTable ? 'dine_in' : 'takeaway',
      tableNumber: pickedTable,
      orderStatus: 'confirmed',
      createdAt: new Date().toISOString(),
      customer: { name: 'Dhruvil Kyada', phone: '9876543210' },
      notes: '',
      items: randomItems,
    };

    mergeOrder(newTicket);
    if (audioEnabled) playSound('new-order');
    toast.success(`🍳 Ticket #${nextNum} received! (${pickedTable ? `Table ${pickedTable}` : 'Takeaway'})`);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time Server-Sent Events (SSE) live subscription
  useEffect(() => {
    unsubRef.current = subscribeToLiveStream('/orders/events/admin', {
      onEvent: (type, payload) => {
        if (type === 'connected') {
          fetchOrders();
        } else if ((type === 'new-order' || type === 'order-update') && payload.order) {
          const incoming = payload.order;
          const isNew = type === 'new-order';
          mergeOrder(incoming);

          if (audioEnabled) {
            if (isNew) playSound('new-order');
            else if (incoming.orderStatus === 'confirmed') playSound('confirm');
            else if (incoming.orderStatus === 'ready') playSound('ready');
            else if (incoming.orderStatus === 'completed') playSound('complete');
          }

          if (isNew) {
            toast.success(`🍳 New Ticket #${incoming.orderNumber} (${incoming.tableNumber ? `Table ${incoming.tableNumber}` : 'Takeaway'})`);
          }
        }
      },
      onError: () => {},
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [audioEnabled]);

  // Order cooking lifecycle transitions
  const updateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { orderStatus: newStatus });
      mergeOrder(data.order);
      if (audioEnabled) {
        if (newStatus === 'ready') playSound('ready');
        if (newStatus === 'completed') playSound('complete');
      }
      toast.success(`Order #${data.order.orderNumber || ''} moved to ${STATUS_LABEL[newStatus] || newStatus}`);
    } catch {
      // Optimistic fallback for simulated or offline tickets
      setOrders((current) =>
        current.map((order) =>
          String(order._id) === String(orderId) ? { ...order, orderStatus: newStatus } : order
        )
      );
      if (audioEnabled) {
        if (newStatus === 'ready') playSound('ready');
        if (newStatus === 'completed') playSound('complete');
      }
      toast.success(`Order moved to ${STATUS_LABEL[newStatus] || newStatus}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const toggleItemCheck = (orderId, itemIndex) => {
    const key = `${orderId}_${itemIndex}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter orders according to status and station
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (viewFilter === 'active') {
        if (!['pending', 'confirmed', 'preparing'].includes(order.orderStatus)) return false;
      } else if (viewFilter === 'ready') {
        if (order.orderStatus !== 'ready') return false;
      } else if (viewFilter === 'history') {
        if (order.orderStatus !== 'completed') return false;
      }

      if (selectedStation !== 'ALL') {
        const hasStationItem = order.items?.some(item => {
          const itemStation = item.kitchenStation || item.station || 'KITCHEN';
          return itemStation === selectedStation;
        });
        if (!hasStationItem) return false;
      }

      return true;
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [orders, viewFilter, selectedStation]);

  // Live summary indicators (Section 5)
  const counts = useMemo(() => {
    const active = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.orderStatus)).length;
    const ready = orders.filter(o => o.orderStatus === 'ready').length;
    const history = orders.filter(o => o.orderStatus === 'completed').length;
    const delayed = orders.filter(o => {
      if (!['pending', 'confirmed', 'preparing'].includes(o.orderStatus)) return false;
      const mins = (now - new Date(o.createdAt).getTime()) / 60000;
      return mins > 20;
    }).length;
    return { active, ready, history, delayed };
  }, [orders, now]);

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* ── Section 5: Kitchen Dashboard Header & Controls ────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#E9E2D8]">
        {/* Title, Subtitle, and Live Counters */}
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#18251F] tracking-tight">
              Kitchen Tickets
            </h1>
            <p className="text-xs sm:text-sm text-[#718078] mt-0.5">
              Manage and track all kitchen orders in real time.
            </p>
          </div>

          {/* Live Summary Indicators (Section 5) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Delayed Orders (>20m) */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition ${
                counts.delayed > 0
                  ? 'bg-red-50 text-[#EF4444] border-red-200 animate-pulse'
                  : 'bg-white text-[#718078] border-[#EAE3D9]'
              }`}
            >
              <AlertTriangle size={13} className={counts.delayed > 0 ? 'text-[#EF4444]' : 'text-[#718078]'} />
              {counts.delayed} Delayed (&gt;20m)
            </span>

            {/* Active Orders */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-[#F59E0B] border border-amber-200">
              <Clock size={13} className="text-[#F59E0B]" />
              {counts.active} Active
            </span>

            {/* Ready Orders */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-[#059669] border border-emerald-200">
              <CheckCircle2 size={13} className="text-[#059669]" />
              {counts.ready} Ready
            </span>
          </div>
        </div>

        {/* Action Controls Cluster (Section 13) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              audioEnabled
                ? 'border-[#059669]/40 bg-emerald-50 text-[#059669]'
                : 'border-[#EAE3D9] bg-white text-[#718078] hover:text-[#18251F]'
            }`}
            title={audioEnabled ? 'Kitchen chime sound on' : 'Kitchen sound muted'}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline font-bold">{audioEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-[#EAE3D9] bg-white text-[#18251F] hover:bg-[#FAF8F3] transition cursor-pointer shadow-2xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kitchen Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-[#EAE3D9] bg-white text-[#18251F] hover:bg-[#FAF8F3] transition cursor-pointer shadow-2xs"
            title="Refresh live kitchen tickets"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#E99308]' : ''} />
          </button>

          {/* New Ticket Button */}
          <button
            type="button"
            onClick={addSimulatedOrder}
            className="px-3.5 py-2 rounded-xl border border-[#E99308]/40 bg-[#E99308]/10 hover:bg-[#E99308]/20 text-[#E99308] text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
            title="Simulate incoming kitchen ticket with chime sound"
          >
            <Plus size={15} className="text-[#E99308]" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* ── Section 6 & 7: Station Filters & Order Status Tabs ─────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        {/* Section 6: Kitchen Station Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#EAE3D9] text-xs shadow-2xs overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#718078] px-2 hidden sm:inline shrink-0">
            Station:
          </span>
          {STATIONS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStation(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                selectedStation === st
                  ? 'bg-[#062F25] text-white shadow-xs'
                  : 'text-[#718078] hover:text-[#18251F] hover:bg-[#FAF8F3]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Section 7: Order Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setViewFilter('active')}
            className={`px-4 py-2 rounded-xl shrink-0 transition cursor-pointer ${
              viewFilter === 'active'
                ? 'bg-[#E99308] text-white shadow-xs font-extrabold'
                : 'bg-white text-[#718078] hover:text-[#18251F] border border-[#EAE3D9]'
            }`}
          >
            Active Queue ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('ready')}
            className={`px-4 py-2 rounded-xl shrink-0 transition cursor-pointer ${
              viewFilter === 'ready'
                ? 'bg-[#059669] text-white shadow-xs font-extrabold'
                : 'bg-white text-[#718078] hover:text-[#18251F] border border-[#EAE3D9]'
            }`}
          >
            Ready to Serve ({counts.ready})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('history')}
            className={`px-4 py-2 rounded-xl shrink-0 transition cursor-pointer ${
              viewFilter === 'history'
                ? 'bg-[#18251F] text-white shadow-xs font-extrabold'
                : 'bg-white text-[#718078] hover:text-[#18251F] border border-[#EAE3D9]'
            }`}
          >
            Completed History ({counts.history})
          </button>
        </div>
      </div>

      {/* ── Section 8 & 9: Kitchen Ticket Cards Grid ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 auto-rows-max pt-1">
        {loading && orders.length === 0 ? (
          <div className="col-span-full py-28 text-center text-[#718078]">
            <Loader2 className="animate-spin mx-auto mb-3 text-[#E99308]" size={36} />
            <span className="font-semibold text-sm">Connecting to real-time kitchen stream...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full py-24 text-center space-y-2 bg-white rounded-3xl border border-[#EAE3D9] p-8 shadow-xs">
            <CheckCircle2 size={44} className="mx-auto text-[#059669]" />
            <div className="text-lg font-display font-extrabold text-[#18251F]">No tickets in this view!</div>
            <div className="text-xs text-[#718078] max-w-sm mx-auto">
              {viewFilter === 'active'
                ? 'All kitchen tickets have been prepared and served.'
                : viewFilter === 'ready'
                ? 'No tickets are currently waiting for pickup/service.'
                : 'No completed tickets logged in this session.'}
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const elapsedMins = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
            const isDelayed = elapsedMins > 20;
            const isWarning = elapsedMins > 10 && elapsedMins <= 20;

            const timerBadgeClass = isDelayed
              ? 'bg-[#EF4444] text-white border-red-600 animate-pulse font-extrabold shadow-xs'
              : isWarning
              ? 'bg-[#F59E0B] text-white border-amber-600 font-extrabold shadow-xs'
              : 'bg-[#FAF8F3] text-[#718078] border-[#E9E2D8] font-bold';

            const isUpdating = updatingOrderId === order._id;

            return (
              <div
                key={order._id}
                className="rounded-2xl border border-[#EAE3D9] bg-white flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_rgba(24,37,31,0.04)] hover:shadow-[0_4px_20px_rgba(24,37,31,0.08)] transition-all duration-200"
              >
                {/* ── Ticket Header ────────────────────────────────────── */}
                <div className="p-4 border-b border-[#EAE3D9] bg-[#FAF8F3]/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-extrabold text-base tracking-wide flex items-center gap-2">
                        <span className="text-[#18251F]">
                          #CAF{order.orderNumber || String(order._id).slice(-4)}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            order.orderType === 'dine_in'
                              ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {order.orderType === 'dine_in' ? `TABLE ${order.tableNumber || 1}` : (order.orderType || 'TAKEAWAY').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-[#718078] mt-1 font-medium">
                        <span className="font-semibold text-[#18251F]">
                          Customer: {order.customer?.name || 'Walk-in Guest'}
                        </span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono text-[11px]">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Preparation Elapsed Timer (Section 9) */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-mono border flex items-center gap-1 shrink-0 ${timerBadgeClass}`}>
                      <Clock size={12} />
                      <span>{elapsedMins}m</span>
                      {isDelayed && <span className="ml-0.5 uppercase tracking-wider text-[10px]">DELAYED</span>}
                    </div>
                  </div>

                  {/* Special order note if present */}
                  {order.notes && (
                    <div className="mt-2.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 p-2 rounded-xl flex items-start gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>Note: {order.notes}</span>
                    </div>
                  )}
                </div>

                {/* ── Ticket Items with Checkbox (Section 8) ──────────── */}
                <div className="p-3.5 space-y-2 flex-1 overflow-y-auto max-h-[320px] custom-scrollbar">
                  {order.items?.map((item, idx) => {
                    const key = `${order._id}_${idx}`;
                    const isChecked = Boolean(checkedItems[key]);

                    return (
                      <div
                        key={key}
                        onClick={() => toggleItemCheck(order._id, idx)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                          isChecked
                            ? 'opacity-40 line-through bg-[#FAF8F3] border-transparent'
                            : 'bg-[#FAF8F3]/60 border-[#EAE3D9] hover:border-[#105B43]/40 hover:bg-white'
                        }`}
                      >
                        <button type="button" className="mt-0.5 text-[#718078] shrink-0" tabIndex={-1}>
                          {isChecked ? <CheckSquare size={17} className="text-[#059669]" /> : <Square size={17} />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[13.5px] font-bold text-[#18251F] leading-snug">
                              <span className="text-[#E99308] mr-1.5 font-extrabold">{item.quantity}x</span>
                              <span>{item.name}</span>
                              {item.variant?.name && (
                                <span className="text-xs font-normal text-[#718078] ml-1">({item.variant.name})</span>
                              )}
                            </div>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-white text-[#718078] border border-[#EAE3D9] shrink-0 font-mono">
                              {item.kitchenStation || item.station || 'KITCHEN'}
                            </span>
                          </div>

                          {/* Product Description */}
                          {item.description && (
                            <p className="text-xs text-[#718078] mt-0.5 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {/* Addons */}
                          {item.addons?.length > 0 && (
                            <div className="text-[11px] text-[#718078] mt-0.5 font-medium">
                              + {item.addons.map(a => a.name).join(', ')}
                            </div>
                          )}

                          {/* Special Instructions */}
                          {item.specialInstructions && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md mt-1 font-semibold inline-block">
                              "{item.specialInstructions}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Primary Action Button (Section 10) ──────────────── */}
                <div className="p-3 border-t border-[#EAE3D9] bg-[#FAF8F3]/60">
                  {['pending', 'confirmed'].includes(order.orderStatus) && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => updateStatus(order._id, 'preparing')}
                      className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#E99308] hover:bg-[#C97B00] text-white shadow-xs transition-all active:scale-[0.98] min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
                      <span>Start Cooking →</span>
                    </button>
                  )}

                  {order.orderStatus === 'preparing' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => updateStatus(order._id, 'ready')}
                      className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#059669] hover:bg-[#047857] text-white shadow-xs transition-all active:scale-[0.98] min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                      <span>Mark as Ready (Bell 🔔)</span>
                    </button>
                  )}

                  {order.orderStatus === 'ready' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => updateStatus(order._id, 'completed')}
                      className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#105B43] hover:bg-[#062F25] text-white shadow-xs transition-all active:scale-[0.98] min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      <span>Complete & Serve ✓</span>
                    </button>
                  )}

                  {order.orderStatus === 'completed' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => updateStatus(order._id, 'preparing')}
                      className="w-full py-2 rounded-xl text-xs font-semibold border border-[#E9E2D8] bg-white text-[#718078] hover:text-[#18251F] hover:bg-[#FAF8F3] min-h-[38px] cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      <span>Reopen Ticket</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
