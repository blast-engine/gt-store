import * as u from '@blast-engine/utils'
import { createTransitionModel } from '@/models/transitions/create-transition-model.fn'
import { helpers } from '@/models/transitions/helpers.utils'

export const addPersons = createTransitionModel(({ state, args, provisions }) => {
  const { get, set } = provisions
  const { persons } = args

  const addPerson = (state, person) => {
    const lastNum = get(state, 'lastPersonNumber')
    const nextNum = lastNum + 1
    
    const lastPersons = get(state, 'persons')
    const nextPersonId = `person_${nextNum}`
  
    const nextState = set(state, {
      lastPersonNumber: nextNum,
      persons: { ...lastPersons, [nextPersonId]: person }
    })

    return nextState
  }

  const nextState = helpers.applySequentialUpdates(
    state, 
    persons.map(person => state => addPerson(state, person))
  )
 
  return nextState
})