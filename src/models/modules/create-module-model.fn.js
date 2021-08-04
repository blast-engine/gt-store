import { GTModuleModel } from './module-model.class'

export const createModuleModel = ({ name, provisionMembers }) =>
  new GTModuleModel({ name, provisionMembers })