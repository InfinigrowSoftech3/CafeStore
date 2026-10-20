import { useState } from 'react';
import { BellRing, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useCartStore from '../../context/cartStore';

export default function TableServiceActions() {
  const diningSessionToken = useCartStore((state) => state.diningSessionToken);
  const [requesting, setRequesting] = useState('');

  const requestService = async (type) => {
    if (!diningSessionToken || requesting) return;
    setRequesting(type);
    try {
      const { data } = await api.post('/session/request', { diningSessionToken, type });
      toast.success(data.alreadyOpen
        ? (type === 'waiter' ? 'A waiter is already on the way.' : 'Your bill has already been requested.')
        : (type === 'waiter' ? 'A waiter has been notified.' : 'The bill has been requested.'));
    } catch (error) {
      toast.error(error.message || 'Unable to send your request.');
    } finally {
      setRequesting('');
    }
  };

  if (!diningSessionToken) return null;

  return (
    <div className="flex w-full gap-2.5 py-1">
      <button
        type="button"
        onClick={() => requestService('waiter')}
        disabled={Boolean(requesting)}
        className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-xs sm:text-sm font-sora font-bold text-stone-800 shadow-2xs hover:bg-stone-50 active:scale-98 transition-all disabled:opacity-50"
      >
        {requesting === 'waiter' ? (
          <Loader2 size={16} className="animate-spin text-stone-600" />
        ) : (
          <BellRing size={16} className="text-[#0F3D2E]" />
        )}
        <span>Call waiter</span>
      </button>

      <button
        type="button"
        onClick={() => requestService('bill')}
        disabled={Boolean(requesting)}
        className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-[#0F3D2E] hover:bg-[#16503D] border border-[#0F3D2E] px-4 text-xs sm:text-sm font-sora font-bold text-white shadow-2xs active:scale-98 transition-all disabled:opacity-50"
      >
        {requesting === 'bill' ? (
          <Loader2 size={16} className="animate-spin text-white" />
        ) : (
          <FileText size={16} className="text-white" />
        )}
        <span className="text-white">Request bill</span>
      </button>
    </div>
  );
}
