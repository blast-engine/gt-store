import * as u from '@blast-engine/utils'

export class GTQuery {

  constructor({ model, provisions, options, args }) {
    this.dependencies = model.deriveDependencies({ provisions, args }) || {}
    this.model = model
    this.provisions = provisions
    this.options = options
    this.args = args
  }

  isEquivalent = ({ query }) => {
    if (this === query) return true

    if (!this.type() || !query.type()) 
      u.logAndThrow({
        msg: 'some query doesnt have a type??',
        dump: { _this: this, other: query }
      })
      
    if (this.type() !== query.type()) return false
    if (!u.areShallowEquivalent(this.provisions, query.provisions)) return false

    return this.argsAreEquivalent({ args: query.args })
  }

  // ---

  type = () =>
    this.model.type

  deriveValue = ({ state, dependencyValues = {} }) =>
    this.model.deriveValue({
      _this: this,
      provisions: this.provisions,
      args: this.args,
      dependencyValues,
      state
    })

  valuesAreEquivalent = ({ value1, value2 }) =>
    this.model.valuesAreEquivalent({
      value1, 
      value2
    })
  
  argsAreEquivalent = ({ args }) => 
    this.model.argsAreEquivalent({
      args1: this.args,
      args2: args
    })

  skipCheckIfDependenciesUnchanged = () => 
    this.model.skipCheckIfDependenciesUnchanged({
      args: this.args,
    })
}