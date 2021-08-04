import * as u from '@blast-engine/utils'

const contextualizePath = ({ contextPath, path = '' }) => {
  const cp = u.setStrPathDelimiter(contextPath, '.')
  const p = u.setStrPathDelimiter(path, '.')
  return `${cp}.${p}`
}

const contextualizeUpdate = ({ contextPath, update }) =>
  u.objKeyMap(update, path => contextualizePath({ path, contextPath }))

const createPathContextualizer = ({ contextPath }) => (path = '') =>
  contextualizePath({ contextPath, path })

const createContextualGet = ({ contextPath }) => (state, path = '') => 
  u.get(state, contextualizePath({ contextPath, path }))
 
const createContextualSet = ({ contextPath }) => (state, update) =>
  u.set(state, contextualizeUpdate({ contextPath, update }))

const createContextualUnset = ({ contextPath }) => (state, pathOrPaths) => 
  u.unset(state, u.enforceArray(pathOrPaths).map(path => contextualizePath({ contextPath, path })))

export const helpers = { 
  contextualizePath,
  contextualizeUpdate,
  createPathContextualizer,
  createContextualGet,
  createContextualSet,
  createContextualUnset
}
