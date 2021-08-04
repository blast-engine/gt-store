import * as u from '@blast-engine/utils'
import { provisioning } from '@/models/queries/provisioning.utils'
import { operators } from '@/models/queries/operators.utils'
import { mockData } from '@/testing/example1/mock.data'
import { mostCommonNamesBetweenAges } from '@/testing/example1/queries/most-common-names-between-ages'
import { mostCommonNamesByAgeGroup } from './most-common-names-by-age-group.query'

// ----

test('deriveDependencies', () => {

  const mcnbaModel = mostCommonNamesBetweenAges
  const mcnbagModel = mostCommonNamesByAgeGroup

  const provisions = provisioning.commonForStandaloneQueries
  const mcnbaCreator = mcnbaModel.provide({ provisions })

  const mcnbagCreator = mcnbagModel.provide({     
    provisions: {
      ...provisioning.commonForStandaloneQueries,
      queryCreators: { mostCommonNamesBetweenAges: mcnbaCreator }
    } 
  })

  const mcnbagQuery = mcnbagCreator.create({
    args: { 
      ageGroups: [
        { name: 'younger', floor: 0, ceil: 40 },
        { name: 'older', floor: 41, ceil: 90 }
      ] 
    }
  })

  const state = mockData.personRegistry
  const value = operators.snapshot({ query: mcnbagQuery, state })

  u.assert([ 
    value.younger.mostCommonName === 'mary',
    value.older.mostCommonName === 'john'
  ])

})