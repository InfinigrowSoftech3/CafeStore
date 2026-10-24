import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useCartStore from '../../context/cartStore';

const extractTableToken = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  try {
    const url = new URL(str, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const token = url.searchParams.get('tableToken') || url.searchParams.get('token');
    if (token) return token;
  } catch {
    // Non-URL input
  }
  // Raw token format (signed token or hex/base64 string of 20+ chars)
  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(str) || (str.length >= 24 && !str.includes(' '))) {
    return str;
  }
  return null;
};

export default function QrScannerModal({ onClose, onTableFound }) {
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isClosedRef = useRef(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  // Pending-confirm state for different-table detection
  const [pendingTable, setPendingTable] = useState(null);
  const { setTable, tableNumber, items, clearCart } = useCartStore();

  const safelyStopScanner = async () => {
    const activeScanner = scannerRef.current;
    if (!activeScanner) return;
    try {
      if (activeScanner.isScanning || (typeof activeScanner.getState === 'function' && activeScanner.getState() === 2)) {
        await activeScanner.stop().catch(() => {});
      }
      try {
        activeScanner.clear();
      } catch {
        // Element may already be unmounted
      }
    } catch {
      // Ignore scanner stop errors on cleanup
    }
  };

  useEffect(() => {
    isClosedRef.current = false;
    let scanner;
    try {
      scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (isProcessingRef.current || isClosedRef.current) return;
          isProcessingRef.current = true;
          await handleTableValue(decodedText);
        },
        () => {}
      ).catch(() => {
        if (!isClosedRef.current) {
          setError('Camera access is unavailable. Please grant camera permissions and try again.');
        }
      });
    } catch {
      if (!isClosedRef.current) {
        setError('Unable to initialize camera scanner.');
      }
    }

    return () => {
      isClosedRef.current = true;
      safelyStopScanner();
    };
  }, []);

  const handleTableValue = async (value) => {
    const token = extractTableToken(value);
    if (!token) {
      setError('That QR code is not a valid table code.');
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
      return;
    }
    let num;
    try {
      const { data } = await api.get('/tables/qr/validate', { params: { token } });
      num = Number(data.table?.tableNumber);
    } catch {
      setError('This table QR code is invalid or expired. Please ask staff for a new code.');
      setTimeout(() => { isProcessingRef.current = false; }, 2000);
      return;
    }

    // If customer already has items for a different table, ask for confirmation
    if (tableNumber && tableNumber !== num && items.length > 0) {
      setPendingTable({ number: num, token });
      return;
    }

    await connectToTable(num, token);
  };

  const connectToTable = async (num, token) => {
    setChecking(true);
    setError('');
    try {
      if (tableNumber != null && tableNumber !== num) {
        clearCart();
      }
      setTable(num, token);
      toast.success(`Table ${String(num).padStart(2, '0')} connected!`, {
        id: 'table-connected',
        icon: '✅',
        duration: 4000,
      });

      if (onTableFound) {
        try {
          onTableFound(num, token);
        } catch {
          // Guard callback errors
        }
      }
      await handleClose();
    } catch (err) {
      setError('This table number is not active. Please scan a valid table QR code.');
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    } finally {
      setChecking(false);
    }
  };

  const handleConfirmNewTable = async () => {
    if (!pendingTable) return;
    clearCart();
    const tableToConnect = pendingTable;
    setPendingTable(null);
    await connectToTable(tableToConnect.number, tableToConnect.token);
  };

  const handleCancelNewTable = () => {
    setPendingTable(null);
    setError('');
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 1000);
  };

  const handleClose = async () => {
    if (isClosedRef.current) return;
    isClosedRef.current = true;
    await safelyStopScanner();
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#7A3316]/60 p-4 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[#EFE4D6] bg-[#FFFDF9] shadow-2xl text-[#2B1810]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EFE4D6] bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F3E9DC] text-[#2B1810] border border-[#EFE4D6] shadow-2xs">
              <QrCode size={19} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#2B1810]">Scan Table QR</h2>
              <p className="text-[11px] text-stone-500">Required to add items & place orders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close QR scanner"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-[#EFE4D6] text-stone-500 hover:bg-[#FBF6EF] hover:text-[#2B1810] transition focus:outline-none focus:ring-1 focus:ring-[#7A3316]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 bg-white">
          {/* Different-table confirmation dialog */}
          {pendingTable && (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/60 p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#2B1810] text-sm">Switch to Table {String(pendingTable.number).padStart(2, '0')}?</p>
                  <p className="text-xs text-stone-700 mt-1">
                    You have {items.length} item{items.length !== 1 ? 's' : ''} in your cart for Table {String(tableNumber).padStart(2, '0')}.
                    Switching tables will <strong>clear your current cart</strong>.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleCancelNewTable}
                      className="flex-1 min-h-[40px] rounded-full border border-[#EFE4D6] bg-white py-2 px-3 text-xs font-bold text-stone-700 hover:bg-[#FBF6EF] transition focus:outline-none focus:ring-1 focus:ring-[#7A3316]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmNewTable}
                      disabled={checking}
                      className="flex-1 min-h-[40px] rounded-full bg-[#7A3316] py-2 px-3 text-xs font-bold text-white hover:bg-[#5E2610] transition disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#7A3316]"
                    >
                      Switch to Table {String(pendingTable.number).padStart(2, '0')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!pendingTable && (
            <>
              <div id="qr-reader" className="overflow-hidden rounded-2xl bg-[#7A3316] shadow-inner border border-[#EFE4D6]" />
              <p className="mt-3.5 text-center text-xs text-stone-600">
                Point your camera at the QR code stand on your cafe table.
              </p>
            </>
          )}

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-medium text-red-700" role="alert" aria-live="polite">
              {error}
            </div>
          )}
          {checking && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs font-medium text-[#2B1810]" role="status" aria-live="polite">
              Validating table & starting dining session...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
