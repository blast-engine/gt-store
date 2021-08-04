import * as u from '@blast-engine/utils'

export const crateBasicTransitionalStore = () => {
  const store = { _state: {}, _emitter: new u.Emitter() }

  store.state = () => store._state

  store.subscribe = handler => store._emitter.subscribe(handler)

  store.set = state => {
    store._state = state
    store._emitter.emit(store._state)
  }

  store.get = path => u.get(store._state, path)

  store.update = update => store.set(u.set(store._state, update))

  store.transition = transition => store.set(transition(store._state))

  return store
}

export const store = () =>
  new GTStore({ transitionalStore: gt.basicTransitionalStore() })