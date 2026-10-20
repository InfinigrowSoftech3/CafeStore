import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      detailsOpen: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[KDS ErrorBoundary caught an unhandled error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndClear = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_err) {
      // Ignore cleanup error
    }
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F6F2] text-[#1C1815] flex items-center justify-center p-4 sm:p-6 font-sans select-none">
          <div className="w-full max-w-lg rounded-3xl border border-[#E5DED5] bg-white p-6 sm:p-8 shadow-xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1 text-xs font-bold text-amber-700">
              <AlertTriangle size={14} className="text-amber-600" />
              <span>Kitchen Display Recovery Mode</span>
            </div>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-[#1C1815] mb-2">
              Kitchen Display Needs Attention
            </h1>
            <p className="text-xs text-[#6E645B] mb-6 max-w-sm mx-auto leading-relaxed">
              The ticket board protected the active queue. You can reload the kitchen display or reset the local station.
            </p>

            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition active:scale-98 min-h-[48px]"
              >
                <RefreshCw size={16} />
                <span>Reload Kitchen Display</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndClear}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F8F6F2] hover:bg-red-50 hover:text-red-600 text-[#6E645B] font-semibold text-xs border border-[#E5DED5] transition active:scale-98 min-h-[44px]"
              >
                <Trash2 size={15} />
                <span>Clear Cache & Reset Station</span>
              </button>
            </div>

            <div className="text-left border-t border-[#E5DED5] pt-4">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ detailsOpen: !prev.detailsOpen }))}
                className="text-xs text-[#6E645B] hover:text-[#1C1815] font-mono underline"
              >
                {this.state.detailsOpen ? 'Hide Diagnostic Details' : 'Show Diagnostic Details'}
              </button>
              {this.state.detailsOpen && (
                <div className="mt-3 p-3 rounded-xl bg-[#F8F6F2] border border-[#E5DED5] text-xs text-red-600 font-mono overflow-x-auto max-h-48 leading-relaxed">
                  <div className="font-bold mb-1">{String(this.state.error?.message || this.state.error)}</div>
                  <pre className="text-[#6E645B] whitespace-pre-wrap">{this.state.errorInfo?.componentStack || this.state.error?.stack}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
