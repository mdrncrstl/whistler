import { Component, type ReactNode } from 'react'
import { MetalFx } from 'metal-fx'

class EffectFallback extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/** Decorative WebGL must never prevent sending a question on unsupported devices. */
export function MetalButtonEffect({ children, paused }: { children: ReactNode; paused: boolean }) {
  if (typeof WebGLRenderingContext === 'undefined') return <div>{children}</div>
  return <div className="ai-metal-control"><div className="ai-metal-decoration" aria-hidden="true"><EffectFallback fallback={null}><MetalFx variant="circle" preset="silver" strength={0.55} paused={paused} normalizeHostStyles={false}><span style={{ display: 'block', width: 38, height: 38, borderRadius: '50%' }}/></MetalFx></EffectFallback></div>{children}</div>
}
