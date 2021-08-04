import * as u from '@blast-engine/utils'
import { createQueryModel } from '@/models/queries/create-query-model.fn'

export const mostCommonNamesByAgeGroup = createQueryModel({
  type: 'mostCommonNamesByAgeGroup',

  deriveDependencies: ({ args, provisions }) => {
    const { queryCreators } = provisions
    const { ageGroups, onlyAcquaintances = false } = args

    const commonNamesByAgeGroupsQueriesArr = ageGroups.map(ageGroup => ({
      name: ageGroup.name,
      query: queryCreators.mostCommonNamesBetweenAges.create({
        args: {
          floorAge: ageGroup.floor, 
          ceilAge: ageGroup.ceil, 
          numResults: 1,
          onlyAcquaintances
        }
      })
    }))

    const commonNamesByAgeGroupsQueries = u.rollup({
      array: commonNamesByAgeGroupsQueriesArr,
      deriveKey: q => q.name,
      deriveValue: q => q.query
    })

    return commonNamesByAgeGroupsQueries
  },

  skipCheckIfDependenciesUnchanged: true,

  deriveValue: ({ args, dependencyValues }) => {
    const { ageGroups } = args

    const resultsArr = ageGroups.map(ageGroup => {
      const mostCommonName = dependencyValues[ageGroup.name][0]
      return { mostCommonName, ageGroup }
    })

    const resultsMap = u.rollup({
      array: resultsArr,
      deriveKey: ({ ageGroup }) => ageGroup.name,
      deriveValue: result => result
    })

    return resultsMap
  }
  
})