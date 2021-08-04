import * as engine from './engine'
import { models } from './models'

export const gt = {
  engine, 
  redux: engine.addTransitionalAPIToReduxStoreCreator,
  store: engine.createKernelWithBasicStore,

  models,
  module: models.modules.createModuleModel,
  query: models.queries.createQueryModel,
  transition: models.transitions.createTransitionModel
}