import * as u from '@blast-engine/utils'

const commonForStandaloneTransitions = { 
  get: u.get,
  set: u.set,
  unset: u.unset
}

export const provisioning = { commonForStandaloneTransitions }