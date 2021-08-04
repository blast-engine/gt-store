import * as u from '@blast-engine/utils'

export const normalizeQueryModelDefinition = ({ givenDefinition }) => {
  const type = givenDefinition.type
  const deriveValue = givenDefinition.deriveValue

  const argsAreValid = u.isFn(givenDefinition.argsAreValid) 
    ? givenDefinition.argsAreValid
    : () => true
  
  let _valuesAreEquivalent 
  if (u.isFn(givenDefinition.valuesAreEquivalent)) 
    _valuesAreEquivalent = givenDefinition.valuesAreEquivalent
  else if (u.isBool(givenDefinition.valuesAreEquivalent))
    _valuesAreEquivalent = () => givenDefinition.valuesAreEquivalent
  else 
    _valuesAreEquivalent = ({ value1, value2 }) => u.areShallowEquivalent(value1, value2)

  const valuesAreEquivalent = ({ value1, value2 }) => {
    if (value1 === value2) return true
    else return _valuesAreEquivalent({ value1, value2 })
  }

  let _argsAreEquivalent 
  if (u.isFn(givenDefinition.argsAreEquivalent)) 
    _argsAreEquivalent = givenDefinition.argsAreEquivalent
  else if (u.isBool(givenDefinition.argsAreEquivalent))
    _argsAreEquivalent = () => givenDefinition.argsAreEquivalent
  else 
    _argsAreEquivalent = ({ args1, args2 }) => u.areShallowEquivalent(args1, args2)
  
  const argsAreEquivalent = ({ args1, args2 }) => {
    if (args1 === args2) return true
    else return _argsAreEquivalent({ args1, args2 })
  }


  let dependencies
  const givenDependencies = givenDefinition.deriveDependencies
  if (u.isFn(givenDependencies)) dependencies = givenDependencies
  else if (u.isObj(givenDependencies)) dependencies = () => givenDependencies
  else dependencies = () => ({})

  let skipCheckIfDependenciesUnchanged
  if (!u.isFn(givenDefinition.skipCheckIfDependenciesUnchanged)) {
    const scidc = givenDefinition.skipCheckIfDependenciesUnchanged
    skipCheckIfDependenciesUnchanged = () => !!scidc
  }

  const definition = {
    type,
    deriveValue,
    argsAreValid,
    valuesAreEquivalent,
    argsAreEquivalent,
    deriveDependencies: dependencies,
    skipCheckIfDependenciesUnchanged,
    givenDefinition
  }

  return definition
}