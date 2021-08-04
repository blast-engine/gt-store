import * as u from '@blast-engine/utils'
import { GTQuery } from './query.class'

export class GTQueryCreator {
  constructor({ model, provisions, options }) {
    this.model = model
    this.provisions = provisions || {}
    this.options = options
  }

  create = ({ args = {}, options = {} } = {}) => new GTQuery({
    model: this.model,
    provisions: this.provisions,
    options: u.merge(this.options, options),
    args
  })
}