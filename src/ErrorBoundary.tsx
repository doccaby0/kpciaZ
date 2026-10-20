import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || '알 수 없는 렌더링 오류' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KPCIA Portal Uncaught Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleRecover = () => {
    try {
      // Purge potentially corrupted cached items
      localStorage.removeItem('kpcia_lectures');
      localStorage.removeItem('kpcia_last_submitted_lecture');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cache purge failed:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-[#0e0e12] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
              👑
            </div>
            <div>
              <h2 className="text-base font-black text-amber-300">KPCIA 포털 안전 복구 모드</h2>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                임시 데이터 캐시 충돌로 인해 화면 렌더링이 일시 중단되었습니다. 아래 버튼을 누르시면 캐시를 안전하게 복원하고 정상 화면으로 즉시 복귀합니다.
              </p>
            </div>
            {this.state.errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40 text-[10px] text-red-300 font-mono text-left break-all">
                {this.state.errorMessage}
              </div>
            )}
            <button
              onClick={this.handleRecover}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-neutral-950 font-black text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              🔄 포털 안전 복원 및 정상 재접속
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
