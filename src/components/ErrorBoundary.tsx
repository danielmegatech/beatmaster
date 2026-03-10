import React from 'react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App crash:', error);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold">🎵 BeatMaster</h1>
            <p className="text-muted-foreground">Algo deu errado. Isso pode ser causado por dados corrompidos no cache.</p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition"
            >
              Limpar cache e recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
