import { models } from '@/models'
import { example1 } from '@/testing/example1'


export const persons = models.modules.createModuleModel({
  name: 'persons',
  provisionMembers: ({ modules, get, set, unset }) => {

    const common = {
      queryProvisions: { get },
      transitionProvisions: { get, set, unset }
    }

    const buildQueryCreators = () => {
      const mostCommonNamesBetweenAges = 
        example1.queries.mostCommonNamesBetweenAges.provide({
          provisions: common.queryProvisions
        })
      
      const mostCommonNamesByAgeGroup = 
        example1.queries.mostCommonNamesByAgeGroup.provide({
          provisions: {
            ...common.queryProvisions,
            queryCreators: { mostCommonNamesBetweenAges }
          }
        })

      return {
        mostCommonNamesBetweenAges,
        mostCommonNamesByAgeGroup
      }  
    }

    const buildTransitionCreators = () => {
      const addPersons = 
        example1.transitions.addPersons.provide({
          provisions: common.transitionProvisions
        })

      const removePersons = 
        example1.transitions.removePersons.provide({
          provisions: common.transitionProvisions
        })
        
      return {
        addPersons,
        removePersons
      }  
    }

    
    const queryCreators = buildQueryCreators()
    const transitionCreators = buildTransitionCreators()
    const members = { queryCreators, transitionCreators }
    return members
  }
})
