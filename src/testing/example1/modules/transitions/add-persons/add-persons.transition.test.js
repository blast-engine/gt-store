import * as u from '@blast-engine/utils'
import { models } from '@/models'
import { example1 } from '@/testing/example1'


test('addPerson', () => {

  const addPersonTransition = models.transitions.convenience.create({
    model: example1.transitions.addPersons,
    args: { persons: [ {name: 'kyle', age: 47, country: 'CA' } ] }
  })

  const state = example1.mockData.personRegistry
  const updatedState = addPersonTransition.apply({ state })

  u.assert([ 
    updatedState.lastPersonNumber === 16,
    u.values(updatedState.persons).some(p => p.name === 'kyle')
  ])

})