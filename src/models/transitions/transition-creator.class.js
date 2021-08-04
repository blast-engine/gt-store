import * as u from '@blast-engine/utils'
import { GTTransition } from './transition.class'
import { helpers } from './helpers.utils'

export class GTTransitionCreator {
  constructor({ transitionFn, provisions, options }) {
    this.transitionFn = transitionFn
    this.provisions = u.merge(provisions, { helpers })
    this.options = options
  }

  create = ({ args, options }) => new GTTransition({
    transitionFn: this.transitionFn,
    provisions: this.provisions,
    options: u.merge(this.options, options),
    args
  })
}