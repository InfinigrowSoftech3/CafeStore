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
    console.error('[Admin ErrorBoundary caught an unhandled error]:', error, errorInfo);
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400">
              <AlertTriangle size={13} className="text-emerald-400" />
              <span>Back Office Recovery Mode</span>
            </div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F3D2E] text-emerald-400 border border-emerald-800/40 shadow-md">
              <AlertTriangle size={28} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
              Back Office Application Issue
            </h1>
            <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
              The admin dashboard protected your session. You can reload the console or reset local station storage.
            </p>

            <div className="space-y-2.5 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-98"
              >
                <RefreshCw size={14} />
                <span>Reload Back Office</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndClear}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 font-semibold text-xs border border-slate-700/80 transition active:scale-98"
              >
                <Trash2 size={13} />
                <span>Clear Cache & Reset Session</span>
              </button>
            </div>

            <div className="text-left">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ detailsOpen: !prev.detailsOpen }))}
                className="text-[11px] text-slate-500 hover:text-slate-300 font-mono underline"
              >
                {this.state.detailsOpen ? 'Hide Diagnostic Details' : 'Show Diagnostic Details'}
              </button>
              {this.state.detailsOpen && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-red-400 font-mono overflow-x-auto max-h-48 leading-relaxed">
                  <div className="font-bold mb-1">{String(this.state.error?.message || this.state.error)}</div>
                  <pre className="text-slate-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack || this.state.error?.stack}</pre>
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
