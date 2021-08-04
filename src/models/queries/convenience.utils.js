import { models } from '@/models'

const create = ({ model, args = {}, provisions: givenProvisions = {} }) => {
  
  const defaultProvisions =
    models.queries.provisioning.commonForStandaloneQueries

  const provisions = { 
    ...defaultProvisions, 
    ...givenProvisions 
  }

  const creator = model.provide({ provisions })
  const query = creator.create({ args })
  return query
}

export const convenience = {
  create
}