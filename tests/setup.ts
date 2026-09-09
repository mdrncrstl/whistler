import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback([{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }

  unobserve() {}
  disconnect() {}
  takeRecords() { return [] as IntersectionObserverEntry[] }
}

Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverMock, writable: true })
Object.defineProperty(globalThis, 'IntersectionObserver', { value: IntersectionObserverMock, writable: true })
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }),
})
Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:masterdeck-test', writable: true })
Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, writable: true })
