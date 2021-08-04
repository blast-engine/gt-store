import { GTTransitionCreator } from './transition-creator.class'

export class GTTransitionModel {
  constructor({ transitionFn }) {
    this.transitionFn = transitionFn
  }

  provide = ({ provisions, options }) => new GTTransitionCreator({
    transitionFn: this.transitionFn,
    options: options,
    provisions
  })
}