import { normalizeQueryModelDefinition } from './normalize-definition.fn'
import { GTQueryModel } from './query-model.class'

export const createQueryModel = givenDefinition => {
  const definition = normalizeQueryModelDefinition({ givenDefinition })
  return new GTQueryModel({ definition })
}