import * as u from '@blast-engine/utils'

export class GTTransition {

  constructor({ transitionFn, provisions, options, args }) {
    this.transitionFn = transitionFn
    this.provisions = provisions
    this.options = options
    this.args = args
  }

  apply = ({ state }) =>
    this.transitionFn({
      provisions: this.provisions,
      args: this.args,
      state
    })


}