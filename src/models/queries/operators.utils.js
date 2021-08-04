import * as u from '@blast-engine/utils'

const deriveDependencyValues = ({ state, query, useValues = [] }) =>
  u.objMap(
    query.dependencies,
    query => { 
      const q = query
      const providedValue = useValues
        .filter(({ query }) => q.isEquivalent({ query }))
        .map(({ value }) => value)[0]

      if (providedValue) return providedValue      
      else return snapshot({ state, query })
    }
  )

const snapshot = ({ state, query, useValues = [] }) => {
  const dependencyValues = deriveDependencyValues({ state, query, useValues })
  const value = query.deriveValue({ state, dependencyValues }) 
  return value
}

export const operators = {
  deriveDependencyValues,
  snapshot
}