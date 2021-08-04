
const applySequentialUpdates = (state, updates) => 
  updates.reduce((updatedState, update) => update(updatedState), state)

export const helpers = { applySequentialUpdates }