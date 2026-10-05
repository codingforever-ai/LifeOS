import { Component, type ReactNode } from 'react';
import { Button } from './primitives';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

/** Catches render errors and shows a recovery UI instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p className="muted" style={{ marginBottom: 16 }}>{this.state.error.message}</p>
          <Button variant="primary" onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
