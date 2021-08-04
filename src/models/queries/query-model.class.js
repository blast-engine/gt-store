import { GTQueryCreator } from './query-creator.class'

export class GTQueryModel {
  constructor({ definition, provisions }) {
    this.definition = definition
    this.provisions = provisions
  }

  provide = ({ provisions = {}, options = {} } = {}) =>
    new GTQueryCreator({
      model: this.definition,
      options,
      provisions
    })
}