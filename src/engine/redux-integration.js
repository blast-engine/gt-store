import * as u from '@blast-engine/utils'
import { GTKernel } from './kernel'

export const addTransitionalAPIToReduxStoreCreator = 
  createReduxStore => 
  (reducer, ...rest) => {
   
    const gtreducer = (state, action) => {
      if (action.type === '__GT_UPDATE__') return action.newState
      return { ...state, ...reducer(state, action) }
    }

    const store = createReduxStore(gtreducer, ...rest)

    const transitionalStore = {
      redux: () => store,
      state: () => store.getState(),
      subscribe: handler => store.subscribe(() => handler(store.getState())),
      get: path => u.get(store.getState(), path),
      set: state => store.dispatch({ type: '__GT_UPDATE__', newState: state }),
      update: update => store.gt.set(u.set(store.getState(), update)),
      transition: transition => store.gt.set(transition(store.getState()))
    }

    store.gt = new GTKernel({ transitionalStore })

    Object.assign(store, store.gt)

    return store
  }