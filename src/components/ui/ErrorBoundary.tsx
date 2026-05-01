"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <div className="text-[28px] opacity-30">◫</div>
        <div className="text-vastu-text font-sans text-[13px]">Something went wrong</div>
        <div className="text-vastu-text-3 font-mono text-[10px] max-w-[260px] break-words">
          {this.state.message}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, message: "" })}
          className="bg-transparent text-vastu-text-2 border border-[rgba(200,175,120,0.15)] text-[11px] px-3 py-[5px] rounded-md hover:border-gold-3 hover:text-vastu-text transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
