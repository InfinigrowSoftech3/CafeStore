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
        <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
          <div className="w-full max-w-lg rounded-3xl border border-stone-800 bg-stone-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-400">
              <AlertTriangle size={13} className="text-amber-400" />
              <span>Kitchen Display Recovery Mode</span>
            </div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md">
              <AlertTriangle size={28} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
              Kitchen Display Issue
            </h1>
            <p className="text-xs text-stone-400 mb-6 max-w-sm mx-auto leading-relaxed">
              The ticket board protected the active queue. You can reload the kitchen display or reset the local station.
            </p>

            <div className="space-y-2.5 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition active:scale-98"
              >
                <RefreshCw size={14} />
                <span>Reload Kitchen Display</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndClear}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-red-950/60 hover:text-red-300 text-stone-300 font-semibold text-xs border border-stone-700/80 transition active:scale-98"
              >
                <Trash2 size={13} />
                <span>Clear Cache & Reset Station</span>
              </button>
            </div>

            <div className="text-left">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ detailsOpen: !prev.detailsOpen }))}
                className="text-[11px] text-stone-500 hover:text-stone-300 font-mono underline"
              >
                {this.state.detailsOpen ? 'Hide Diagnostic Details' : 'Show Diagnostic Details'}
              </button>
              {this.state.detailsOpen && (
                <div className="mt-3 p-3 rounded-xl bg-stone-950 border border-stone-800 text-[10px] text-red-400 font-mono overflow-x-auto max-h-48 leading-relaxed">
                  <div className="font-bold mb-1">{String(this.state.error?.message || this.state.error)}</div>
                  <pre className="text-stone-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack || this.state.error?.stack}</pre>
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
