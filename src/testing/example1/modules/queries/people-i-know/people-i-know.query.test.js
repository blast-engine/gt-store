import * as u from '@blast-engine/utils'
import { models } from '@/models'
import { example1 } from '@/testing/example1'

// ----

test('defaultPerformanceConfig', () => {

  const { convenience, operators } = models.queries

  const model = example1.queries.peopleIKnow
  const query = convenience.create({ model })

  const state = example1.mockData.peopleIKnow
  const value1 = operators.snapshot({ query, state })
  const value2 = operators.snapshot({ query, state })
  u.assert([ query.valuesAreEquivalent({ value1, value2 }) ])

  const query2 = convenience.create({ model })
  u.assert([ query2.isEquivalent({ query }) ])

})