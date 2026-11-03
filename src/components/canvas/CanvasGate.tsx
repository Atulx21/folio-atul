'use client';

import React, { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

const SpatialCanvas = dynamic(() => import('@/components/canvas/SpatialCanvas'), {
  ssr: false,
});

interface Props {
  onFail: () => void;
}

interface State {
  failed: boolean;
}

/**
 * Error boundary that wraps the dynamically imported SpatialCanvas.
 * Any render-time error inside the canvas tree calls props.onFail(),
 * which lets the page fall back to StaticPortfolio without a crash.
 */
export default class CanvasGate extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[CanvasGate] WebGL render error — falling back to static mode:', error);
    this.props.onFail();
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return <SpatialCanvas onFail={this.props.onFail} />;
  }
}

