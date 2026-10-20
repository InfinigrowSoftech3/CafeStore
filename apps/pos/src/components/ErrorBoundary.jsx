import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './ui';

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
    console.error('[POS ErrorBoundary caught an unhandled error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndClear = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('infinigrow_pos_db');
      }
    } catch (_err) {
      // Ignore cleanup error
    }
    window.location.href = window.location.origin;
  };

  handleResetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-pos-bg text-pos-text flex items-center justify-center p-4 sm:p-6 font-sans select-none">
          <div className="w-full max-w-lg rounded-3xl border border-pos-border bg-pos-surface/95 p-6 sm:p-8 shadow-elevation2 backdrop-blur-md text-center">
            {/* Terminal Pill */}
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-pos-raised border border-pos-warning/30 px-3.5 py-1 text-xs font-bold text-pos-warning">
              <AlertTriangle size={14} className="text-pos-warning" />
              <span>POS Terminal Recovery Mode</span>
            </div>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pos-warning/10 text-pos-warning border border-pos-warning/30 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-pos-text mb-2">
              Station Needs Attention
            </h1>
            <p className="text-sm text-pos-muted mb-6 max-w-sm mx-auto leading-relaxed">
              The POS workstation protected your active transactions. You can reload the station or clear local cache to resume counter operations immediately.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                icon={RefreshCw}
                onClick={this.handleReload}
                className="w-full font-bold shadow-elevation1"
              >
                Reload POS Terminal
              </Button>

              <Button
                variant="secondary"
                size="md"
                icon={Trash2}
                onClick={this.handleResetAndClear}
                className="w-full text-xs text-pos-muted hover:text-pos-danger hover:border-pos-danger/40"
              >
                Clear Stale Cache & Reset Station
              </Button>
            </div>

            {/* Expandable Diagnostic Stack Trace */}
            <div className="text-left border-t border-pos-border pt-4">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ detailsOpen: !prev.detailsOpen }))}
                className="text-xs text-pos-muted hover:text-pos-text font-mono underline touch-press"
              >
                {this.state.detailsOpen ? 'Hide Diagnostic Details' : 'Show Diagnostic Details'}
              </button>
              {this.state.detailsOpen && (
                <div className="mt-3 p-3 rounded-xl bg-pos-bg border border-pos-border text-xs text-pos-danger font-mono overflow-x-auto max-h-48 leading-relaxed pos-scrollbar">
                  <div className="font-bold mb-1">{String(this.state.error?.message || this.state.error)}</div>
                  <pre className="text-pos-muted whitespace-pre-wrap">{this.state.errorInfo?.componentStack || this.state.error?.stack}</pre>
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
