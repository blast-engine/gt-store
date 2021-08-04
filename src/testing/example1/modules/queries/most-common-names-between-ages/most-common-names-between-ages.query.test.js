import * as u from '@blast-engine/utils'
import { models } from '@/models'
import { example1 } from '@/testing/example1'


// ----

test('deriveValue', () => {
  
  const mcnbaModel = example1.queries.mostCommonNamesBetweenAges 

  const provisions = models.queries.provisioning.commonForStandaloneQueries
  const mcnbaCreator = mcnbaModel.provide({ provisions })

  const args = { numResults: 2 }
  const mcnbaQuery = mcnbaCreator.create({ args })

  const state = example1.mockData.personRegistry
  const value = mcnbaQuery.deriveValue({ state })

  u.assert([
    u.arraysAreSame(value, [ 'mary', 'john' ])
  ])

})

// ----

test('isEquivalent', () => {
  
  const mcnbaModel = example1.queries.mostCommonNamesBetweenAges 

  const provisions1 = models.queries.provisioning.commonForStandaloneQueries
  const mcnbaCreator1 = mcnbaModel.provide({ provisions: provisions1 })

  const mcnbaQuery1_1 = mcnbaCreator1.create({ args: { numResults: 2 } })
  const mcnbaQuery2_1 = mcnbaCreator1.create({ args: { numResults: '2' } })
  const mcnbaQuery3_1 = mcnbaCreator1.create({ args: { numResults: 3 } })

  u.assert([
    mcnbaQuery1_1.isEquivalent({ query: mcnbaQuery2_1 }),
    !mcnbaQuery1_1.isEquivalent({ query: mcnbaQuery3_1 })
  ])

  const provisions2 = u.set(provisions1, { 'foo': 'bar' })
  const mcnbaCreator2 = mcnbaModel.provide({ provisions: provisions2 })

  const mcnbaQuery1_2 = mcnbaCreator2.create({ args: { numResults: 2 } })

  u.assert([
    !mcnbaQuery1_1.isEquivalent({ query: mcnbaQuery1_2 })
  ])

})

// ----

test('valuesAreEquivalent', () => {
  
  const mcnbaQuery = models.queries.convenience.create({
    model: example1.queries.mostCommonNamesBetweenAges,
    args: { numResults: 2 }
  })

  const state = example1.mockData.personRegistry
  const v1 = mcnbaQuery.deriveValue({ state })
  const v2 = [ ...v1 ].reverse()
  const v3 = v1.slice(0, 1)

  u.assert([
    mcnbaQuery.valuesAreEquivalent({ value1: v1, value2: v2 }),
    !mcnbaQuery.valuesAreEquivalent({ value1: v1, value2: v3 }),
  ])

})

// ----

test('dependencies by hand', () => {

  const mcnbaQuery = models.queries.convenience.create({
    model: example1.queries.mostCommonNamesBetweenAges,
    args: { numResults: 2, onlyAcquaintances: true },
    provisions: { 
      get: models.modules.helpers.createContextualGet({ contextPath: 'personRegistry' }),
      queryCreators: { 
        peopleIKnow: example1.queries.peopleIKnow.provide({
          provisions: {
            get: models.modules.helpers.createContextualGet({ contextPath: 'peopleIKnow' }),
          }
        }) 
      } 
    }
  })

  const state = {
    peopleIKnow: example1.mockData.peopleIKnow,
    personRegistry: example1.mockData.personRegistry
  }

  const value = mcnbaQuery.deriveValue({ 
    state: state,
    dependencyValues: {
      peopleIKnow: mcnbaQuery.dependencies.peopleIKnow.deriveValue({ state })
    }
  })

  u.assert([ 
    u.arraysAreSame(value, [ 'david', 'mary' ]) 
  ])

})

