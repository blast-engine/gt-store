import * as u from '@blast-engine/utils'
import { models } from '@/models'
import { example1 } from '@/testing/example1'

test('works', () => {

  const persons = example1.modules.persons.create()

  const fullState1 = persons.set({}, example1.mockData.personRegistry)
  const modulePath = persons.path()
  const moduleState = u.get(fullState1, modulePath)
  const moduleStateIsWhatWeSet = u.areShallowEquivalent(moduleState, example1.mockData.personRegistry)
  u.assert([ moduleStateIsWhatWeSet ])

  const v1 = persons.get(fullState1, 'lastPersonNumber')
  u.assert([ v1 === 15 ])

  const q1 = persons.queries.mostCommonNamesBetweenAges({ numResults: 2 })
  const v2 = q1.deriveValue({ state: fullState1 })
  u.assert([ u.arraysAreSame(v2, [ 'mary', 'john' ]) ])

  const q2 = persons.queries.mostCommonNamesByAgeGroup({ 
    ageGroups: [
      { name: 'younger', floor: 0, ceil: 40 },
      { name: 'older', floor: 41, ceil: 90 }
    ] 
  })

  const v3 = models.queries.operators.snapshot({ state: fullState1, query: q2 })
  u.assert([ 
    v3.younger.mostCommonName === 'mary', 
    v3.older.mostCommonName === 'john'
  ])

  const t1 = persons.transitions.removePersons({ 
    personIds: [ 'person_1', 'person_3', 'person_5', 'person_6' ]
  })

  const fullState2 = t1.apply({ state: fullState1 })
  u.assert([ 
    persons.get(fullState2, 'persons/person_1') === undefined,
    persons.get(fullState2, 'persons/person_2') !== undefined,
    persons.get(fullState2, 'persons/person_3') === undefined,
  ])

  const v4 = models.queries.operators.snapshot({ state: fullState2, query: q2 })
  
  u.assert([ 
    v4.younger.mostCommonName === 'david', 
    v4.older.mostCommonName === 'john'
  ])
  

})