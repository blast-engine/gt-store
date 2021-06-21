import * as u from '@blast-engine/utils'

export const createQueryCreatorCreator = ({ getNextAnonymousQueryId, snap }) => givenDefinition => {
  const type = givenDefinition.type || getNextAnonymousQueryId()

  const deriveValue = u.isFn(givenDefinition) 
    ? givenDefinition
    : givenDefinition.deriveValue

  const argsAreValid = u.isFn(givenDefinition.argsAreValid) 
    ? givenDefinition.argsAreValid
    : () => true

  const valuesAreEquivalent = !u.isFn(givenDefinition.valuesAreEquivalent) 
    ? givenDefinition.valuesAreEquivalent
    : ({ value, otherValue }) => 
      u.areShallowEquivalent({ value, otherValue })

  let argsAreEquivalent 
  if (!u.isFn(givenDefinition.argsAreEquivalent)) {
    if (u.isBool(givenDefinition.argsAreEquivalent))
      argsAreEquivalent = () => givenDefinition.argsAreEquivalent
    else
      argsAreEquivalent = ({ args, otherArgs }) =>
        u.areShallowEquivalent({ args, otherArgs })
  }

  let dependencies
  const givenDependencies = givenDefinition.dependencies
  if (u.isFn(givenDependencies)) dependencies = givenDependencies
  else if (u.isObj(givenDependencies)) dependencies = () => givenDependencies
  else dependencies = () => ({})

  let skipCheckIfDependenciesUnchanged
  if (!u.isFn(givenDefinition.skipCheckIfDependenciesUnchanged)) {
    const scidc = givenDefinition.skipCheckIfDependenciesUnchanged
    skipCheckIfDependenciesUnchanged = () => !!scidc
  }

  const provisionalStage = 'definition'
  const provisions = { snap }

  const definition = {
    type,
    deriveValue,
    argsAreValid,
    valuesAreEquivalent,
    argsAreEquivalent,
    dependencies,
    skipCheckIfDependenciesUnchanged,
    givenDefinition
  }

  const queryCreator = {
    definition,
    provisionalStage,
    provisions
  }

  return queryCreator
}

export const provisionModuleContextToQueryCreator = ({ 
  queryCreator: qc, 
  module,
} = {}) => { 
  const definition = qc.definition
  const provisionalStage = 'module-context'
  const provisions = { 
    ...qc.provisions, 
    module, 
  }

  const queryCreatorWithModuleContext = {
    definition,
    provisionalStage,
    provisions
  }

  return queryCreatorWithModuleContext
}

export const createQuery = ({
  queryCreator,
  provisions = {},
  args = {}
}) => {

  const qc = queryCreator
  const d = qc.definition

  if (!d.argsAreValid({ args })) 
    u.logAndThrow({
      msg: `invalid args provided to query ${qc.type}`,
      dump: { queryCreator: qc }
    })

  const finalProvisions = { ...qc.provisions, ...provisions }
  const fp = finalProvisions

  const methods = { 

    type: () => d.type,
    args: () => args,

    dependencies: () => 
      d.dependencies({ ...fp, args }),

    deriveValue: ({ state, deps }) => 
      d.deriveValue({ ...fp, state, deps, args }),

    valuesAreEquivalent: 
      d.valuesAreEquivalent,

    argsAreEquivalent: ({ otherArgs }) => 
      d.argsAreEquivalent({ args, otherArgs }),
    
    skipCheckIfDependenciesUnchanged:
      d.skipCheckIfDependenciesUnchanged,

    equals: ({ otherQuery }) => {
      if (!d.type || !otherQuery.type) 
        u.logAndThrow({
          msg: 'some query doesnt have a type??',
          dump: { query, otherQuery }
        })
        
      if (d.type !== otherQuery.type) return false

      return d.argsAreEquivalent({
        args: args,
        otherArgs: otherQuery.args
      })
    }

  }

  const query = {
    isGTQuery: true,
    definition: d,
    provisions: fp,
    methods,
    args
  }

  return query
}

// ----

const createQueryCreator = createQueryCreatorCreator({
  getNextAnonymousQueryId: () => 'anonnn!',
  snap: () => 'snappp val!'
})

export const querySimple = createQueryCreator({
  type: 'example_simple',

  deriveValue: ({ state, args, deps, options }) => {
    const vals = args.map(key => u.get(state, key))
    // if (options.debugDeriveValue)
    //   console.log(vals)
    return vals.reduce((sum, val) => {
      const num = parseInt(val)
      if (isNaN(num)) return sum
      return sum + num
    }, 0)
  },

  valuesAreEquivalent: (value1, value2) => false,
  
  argsAreValid: args => {
    // if (!isArr(args.things)) return false
    return true
  },

  argsAreEquivalent: (args1, args2) => {
    // if (args1.things.length !== args2.things.length) return false
    // if (args1.things.some(thing => !args2.things.includes(thing))) return false
    return true
  },

  skipCheckIfDependenciesUnchanged: true,
  
  // dependencies: args => ({
  //   test2: test2()
  // })

})

