import { GTModule } from './module.class'

export class GTModuleModel {

  constructor({ name, provisionMembers }) {
    this.name = name
    this.provisionMembers = provisionMembers
  }

  create = ({ modules } = {}) => new GTModule({
    name: this.name,
    provisionMembers: this.provisionMembers,
    modules
  })

}