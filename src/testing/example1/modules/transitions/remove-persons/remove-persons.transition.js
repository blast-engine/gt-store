import * as u from '@blast-engine/utils'
import { createTransitionModel } from '@/models/transitions/create-transition-model.fn'
import { helpers } from '@/models/transitions/helpers.utils'

export const removePersons = createTransitionModel(({ state, args, provisions }) => {
  const { unset } = provisions
  const { personIds } = args

  const nextState = helpers.applySequentialUpdates(
    state, 
    personIds.map(personId => state => unset(state, `persons/${personId}`))
  )
  
  return nextState
})