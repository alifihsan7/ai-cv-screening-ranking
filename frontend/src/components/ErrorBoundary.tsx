import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleHardReset = () => {
    try {
      localStorage.removeItem('cv_screening_step')
      localStorage.removeItem('cv_screening_job_id')
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F2F5F3] p-6 text-[#13221C] font-sans antialiased">
          <div className="max-w-md w-full bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile-md p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#FCEBEB] border border-[#F6C1C1] text-[#8C1819] flex items-center justify-center mx-auto text-xl font-mono font-bold">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#13221C] tracking-tight">
                Terjadi Kendala Tampilan Antarmuka
              </h2>
              <p className="text-xs text-[#2D4439] leading-relaxed">
                Komponen antarmuka mengalami galat tak terduga. State cache lokal dapat disinkronkan kembali.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-[#F2F5F3] border border-[#D5DFD9] rounded-xl text-left overflow-auto max-h-28">
                <p className="font-mono text-[11px] text-[#8C1819] break-words">
                  {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="h-8 px-4 bg-[#1B4938] hover:bg-[#124B2E] text-[#FCFDFC] text-xs font-semibold rounded-lg shadow-tactile-sm transition-all duration-150 cursor-pointer"
              >
                Muat Ulang
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="h-8 px-4 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#2D4439] text-xs font-semibold rounded-lg shadow-tactile-sm transition-all duration-150 cursor-pointer"
              >
                Reset Cache & Beranda
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
