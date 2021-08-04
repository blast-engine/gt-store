import { GTTransitionModel } from './transition-model.class'

export const createTransitionModel = transitionFn =>
  new GTTransitionModel({ transitionFn })