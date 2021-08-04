import * as u from '@blast-engine/utils'
import { createQueryModel } from '@/models/queries/create-query-model.fn'

export const mostCommonNamesBetweenAges = createQueryModel({
  type: 'mostCommonNamesBetweenAges',

  argsAreEquivalent: ({ args1, args2 }) => 
    u.kv(args1).every(({ k:name, v:value }) => (
      toInt(value) === toInt(args2[name])
    )),

  deriveDependencies: ({ args, provisions }) => {
    const { queryCreators } = provisions
    const { onlyAcquaintances = false } = args

    if (!onlyAcquaintances) return null

    const peopleIKnow = queryCreators.peopleIKnow.create()
    return { peopleIKnow }
  },
  

  deriveValue: ({ state, args, provisions, dependencyValues }) => {
    const { get } = provisions
    const { peopleIKnow } = dependencyValues
    const { floorAge = 0, ceilAge = 150, numResults = 1, onlyAcquaintances = false } = args

    const _floorAge = toInt(floorAge)
    const _ceilAge = toInt(ceilAge)
    const _numResults = toInt(numResults)

    const persons = get(state, 'persons')
    const personsArr = u.kv(persons)
      .filter(({ k: personId }) => !onlyAcquaintances || peopleIKnow.includes(personId))
      .map(({ v: person }) => person)

    const computedView = personsArr.reduce((acc, person) => {
      if (person.age > _ceilAge) return acc
      if (person.age < _floorAge) return acc
      
      const prevCountForName = acc.byName[person.name] || 0
      const nextCountForName = prevCountForName + 1

      const prevMostCommonNameCount = acc.mostCommonNameCount
      const nextMostCommonNameCount = prevMostCommonNameCount < nextCountForName
        ? nextCountForName
        : prevMostCommonNameCount

      const prevNamesForPrevCount = acc.byCount[prevCountForName] || []
      const nextNamesForPrevCount = prevNamesForPrevCount
        .filter(name => name !== person.name)

      const prevNamesForNextCount = acc.byCount[nextCountForName] || []
      const nextNamesForNextCount = prevNamesForNextCount
        .filter(name => name !== person.name)
        .concat(person.name)

      const updatedAcc = { 
        byName: {
          ...acc.byName, 
          [person.name]: nextCountForName
        },
        byCount: {
          ...acc.byCount,
          [prevCountForName]: nextNamesForPrevCount,
          [nextCountForName]: nextNamesForNextCount
        },
        mostCommonNameCount: nextMostCommonNameCount
      }

      return updatedAcc

    }, { byName: {}, byCount: {}, mostCommonNameCount: 0 })

    const namesByCount = computedView.byCount
    const mostCommonNameCount = computedView.mostCommonNameCount

    const mostCommonNames = u.arrayOf(mostCommonNameCount).reduce((mostCommonNames, _, i) => {
      const slotsOpen = _numResults - mostCommonNames.length
      if (slotsOpen === 0) return mostCommonNames
      const countIndex = (parseInt(mostCommonNameCount) - i) + ''
      const namesForCount = namesByCount[countIndex]
      return mostCommonNames.concat(namesForCount.slice(0, slotsOpen))
    }, [])

    return mostCommonNames
  },

  valuesAreEquivalent: ({ value1, value2 }) => 
    u.arraysHaveSameItems(value1, value2)

})


// --- helpers

const toInt = thing => {
  const { abs } = Math
  const int = parseInt(thing)
  if (isNaN(int)) return 0
  return abs(parseInt(thing))
}
