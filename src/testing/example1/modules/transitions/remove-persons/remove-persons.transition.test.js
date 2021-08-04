import * as u from '@blast-engine/utils'
import { provisioning } from '@/models/transitions/provisioning.utils'
import { removePersons } from '@/testing/example1/transitions/remove-persons'
import { mockData } from '@/testing/example1/mock.data'

test('removePerson', () => {

  const removePersonsModel = removePersons

  const provisions = provisioning.commonForStandaloneTransitions
  const removePersonsCreator = removePersonsModel.provide({ provisions })

  const removePersonTransition = removePersonsCreator.create({ 
    args: { personIds: [ 'person_1', 'person_3' ] } 
  })

  const state = mockData.personRegistry
  const updatedState = removePersonTransition.apply({ state })

  u.assert([ 
    updatedState.persons.person_1 === undefined,
    updatedState.persons.person_2 !== undefined,
    updatedState.persons.person_3 === undefined
  ])

})