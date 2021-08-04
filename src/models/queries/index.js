import { normalizeQueryModelDefinition } from './normalize-definition.fn'
import { GTQuery} from './query.class'
import { GTQueryCreator } from './query-creator.class'
import { GTQueryModel } from './query-model.class'
import { createQueryModel } from './create-query-model.fn'
import { provisioning } from './provisioning.utils'
import { operators } from './operators.utils'
import { convenience } from './convenience.utils'

export const queries = {
  normalizeQueryModelDefinition,
  GTQuery,
  GTQueryCreator,
  GTQueryModel,
  createQueryModel,
  provisioning,
  operators,
  convenience
}