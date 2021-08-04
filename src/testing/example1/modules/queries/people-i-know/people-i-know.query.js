import * as u from '@blast-engine/utils'
import { createQueryModel } from '@/models/queries/create-query-model.fn'

export const peopleIKnow = createQueryModel({
  type: 'peopleIKnow',
  deriveValue: ({ state, provisions }) => {
    const { get } = provisions
    const peopleIds = u.k(get(state, ''))
    return peopleIds
  }
}) 