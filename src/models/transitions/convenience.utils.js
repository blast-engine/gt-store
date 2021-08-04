import { provisioning } from '@/models/transitions/provisioning.utils'

const create = ({ model, args = {}, provisions: givenProvisions = {} }) => {
  
  const provisions = { 
    ...provisioning.commonForStandaloneTransitions, 
    ...givenProvisions 
  }

  const creator = model.provide({ provisions })
  const transition = creator.create({ args })
  return transition
}

export const convenience = {
  create
}