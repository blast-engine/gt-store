import * as u from '@blast-engine/utils'
import { helpers } from './helpers.utils' 

export class GTModule {

  constructor({ 
    name = 'anonymous-module', 
    provisionMembers = () => ({}), 
    modules = {} 
  }) {
    this.name = name
    this.modules = modules || {}

    const contextPath = `_modules/${name}`
    this.contextPath = contextPath
    this.path = helpers.createPathContextualizer({ contextPath })
    this.get = helpers.createContextualGet({ contextPath }) 
    this.set = helpers.createContextualSet({ contextPath })
    this.unset = helpers.createContextualUnset({ contextPath })
    
    const { 
      queryCreators = null,
      transitionCreators = null,
    } = provisionMembers({ 
      get: this.get,
      set: this.set,
      unset: this.unset,
      modules: this.modules
    })

    const convenientCreator = creator => 
      (args = {}, more = {}) => creator.create({ args, ...more })

    this.queries = u.objMap(queryCreators, convenientCreator)
    this.transitions = u.objMap(transitionCreators, convenientCreator)

  }
}
