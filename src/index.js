import React from 'react'
import { Emitter, set, kv, k, v, rollup, isObj, isFn, objMap } from '@blast-engine/utils'

export const generateGetter = (queryFactory, gts) =>
  args => gts.snap(queryFactory(args))

export const generateAction = (transitionFactory, gts) =>
  args => gts.doTransition(transitionFactory(args))

export const generateGetters = (queryFactories, gts) =>
  objMap(queryFactories, qf => generateGetter(qf, gts))

export const generateActions = (transitionFactories, gts) =>
  objMap(transitionFactories, tf => generateAction(tf, gts))

export const createGTTransitionFactory = transitionFn => args => state => {
  return transitionFn({ args, state })
}

export const createGTStateModule = root => {
  const createModularGTQueryFactory = givenDefinition => {
    
    const givenType = givenDefinition.type
    const modularType = `${root}_${givenType}`
    
    const givenDeriveValue = givenDefinition.deriveValue
    const modularDeriveValue = args => {
      const state = args.state
      const moduleState = state[root] || {}
      return givenDeriveValue({ ...args, state: moduleState })
    }
    
    const definition = { 
      ...givenDefinition, 
      type: modularType,
      deriveValue: modularDeriveValue
    }

    return createGTQueryFactory(definition)
  }

  const createModularGTTransitionFactory = modularTransitionFn => args => state => {
    const moduleState = state[root] || {}
    const modularUpdateMap = modularTransitionFn({ args, state: moduleState })
    const updateMap = rollup({
      array: kv(modularUpdateMap),
      deriveValue: ({ v }) => v,
      deriveKey: ({ k }) => `${root}.${k}`
    })
    return updateMap
  }

  const moduleStateQ = createGTFunctionQuery(({ state }) => state[root] || {})
  const moduleStateF = createFactoryFromQuery(moduleStateQ)

  return { 
    createModularGTQueryFactory, 
    createModularGTTransitionFactory,
    moduleStateQ,
    moduleStateF
  }
}

export const createGTQueryFactory = givenDefinition => givenArgs => {
  const definition = { ...(givenDefinition || {}) }
  const args = { ...(givenArgs || {}) }

  if (!['function'].includes(typeof definition.argsAreValid))
    definition.argsAreValid = args => true

  if (!['function'].includes(typeof definition.valuesAreEquivalent))
    definition.valuesAreEquivalent = (args1, args2) => false

  if (!['function', 'boolean'].includes(typeof definition.argsAreEquivalent))
    definition.argsAreEquivalent = (args1, args2) => false

  if (isObj(definition.dependencies)) {
    const deps = definition.dependencies
    definition.dependencies = () => deps
  }

  if (!isFn(definition.dependencies)) {
    definition.dependencies = () => {}
  }

  if (!isFn(definition.skipCheckIfDependenciesUnchanged)) {
    const scidc = definition.skipCheckIfDependenciesUnchanged
    definition.skipCheckIfDependenciesUnchanged = () => !!scidc
  }

  const deps = definition.dependencies
  definition.dependencies = args => kv(deps(args))
    .map(({ k:name, v:query }) => ({ name, query }))

  const query = {
    isGTQuery: true,
    ...definition,
    definition, givenDefinition,
    args, givenArgs
  }

  query.type = definition.type || null
  query.equals = other => {
    if (!query.type) return false
    if (!other.type) return false
    if (query.type !== other.type) return false

    if (definition.argsAreEquivalent === true) return true
    if (typeof definition.argsAreEquivalent === 'function') 
      return definition.argsAreEquivalent(query.args, other.args)
    return false
  }

  if (!definition.argsAreValid(args)) {
    const errMsg = `invalid args provided to query ${query.type}`
    console.error(errMsg, args)
    throw new Error(errMsg)
  }

  return query
}

export const createGTQuery = definition =>
  createGTQueryFactory({
    ...definition,
    type: definition.type || 'anonymous_query',
  })()

export const createGTFunctionQuery = deriveValue => {
  return createGTQuery({
    type: 'anonymous_function_query',
    deriveValue
  })
}

export const createFactoryFromQuery = query => () => query

class GTStore {
  state = {}
  emitter = new Emitter
  update = updateMap => {
    const newState = set(this.state, updateMap)
    this.state = newState
    this.emitter.emit(this.state)
  }

  start = () => {
    this.emitter.subscribe(this.updateWatchers)
    return this
  }

  doTransition = transition => {
    const updateMap = transition(this.state)
    this.update(updateMap)
  }

  watcherIdCounter = 0
  watchers = {}
  subscriptionIdCounter = 0
  subscriptions = {}

  snap = query => {
    const watcher = this.getWatcherForQuery({ query })
    const subscription = this.createSubscription({ watcher, handler: () => null })
    this.updateWatchers()
    const value = watcher.currentValue
    subscription.kill()
    return value
  }

  updateWatchers = () => {
    const watcherIdsChecked = {}
    const watchersChanged = []
    let watcherIdsNotChecked = k(this.watchers)
    while (watcherIdsNotChecked.length) {
      let watcherIdsSkippedThisRound = []
      watcherIdsNotChecked.forEach(watcherId => {
        const watcher = this.watchers[watcherId]

        const depChecks = watcher.activeDependencies
          .map(({ watcherId }) => ({ watcherId, check: watcherIdsChecked[watcherId] }))
        const allDepsChecked = depChecks.every(depCheck => !!depCheck.check)

        if (!allDepsChecked) { watcherIdsSkippedThisRound.push(watcherId); return }

        if (
          watcher.activeDependencies.length &&
          watcher.query.skipCheckIfDependenciesUnchanged({ args: watcher.query.args })
        ) {
          const someDepChanged = depChecks.some(depCheck => !!depCheck.check.changed)
          if (!someDepChanged) { watcherIdsChecked[watcherId] = { changed: false }; return }
        }

        const nextValue = this.deriveValueForWatcher(watcher)

        const valuesAreEquivalent = watcher.query
          .valuesAreEquivalent(watcher.currentValue, nextValue)

        if (!valuesAreEquivalent) {
          watcher.currentValue = nextValue
          watcherIdsChecked[watcherId] = { changed: true }
          watchersChanged.push(watcher)
        } else {
          watcherIdsChecked[watcherId] = { changed: false }
        }
      })
      watcherIdsNotChecked = watcherIdsSkippedThisRound
    }

    watchersChanged.forEach(watcher => {
      v(watcher.subscriptions)
        .forEach(s => s.handler(watcher.currentValue))
    })
  }

  findExistingWatcherForQuery = ({ query }) => {
    const existingWatcher = v(this.watchers).find(watcher => {
      return watcher.query.equals(query)
    })
    return existingWatcher || null
  }

  deriveValueForWatcher = watcher => {

    const dependencyCurrentValues = rollup({
      array: watcher.activeDependencies, 
      deriveValue: ad => ad.watcher.currentValue,
      deriveKey: ad => ad.dependency.name
    })
    
    const value = watcher.query.deriveValue({ 
      state: this.state,
      args: watcher.query.args,
      depVals: dependencyCurrentValues
    })

    return value
  }

  createWatcherForQuery = ({ query }) => {
    const id = `watcher_${this.watcherIdCounter++}` 

    const activeDependencies = query.dependencies(query.args).map(dependency => {
      const watcher = this.getWatcherForQuery({ 
        query: dependency.query
      })
      return { watcher, watcherId: watcher.id, dependency }
    })

    const watcher = {
      id,
      query,
      activeDependencies,
      subscriptions: {},
      dependents: {}
    }

    activeDependencies.forEach(ad => {
      ad.watcher.dependents[id] = watcher
    })

    const initialValue = this.deriveValueForWatcher(watcher)
    watcher.currentValue = initialValue

    this.watchers[id] = watcher
    return watcher
  }

  getWatcherForQuery = ({ query }) => {
    const existingWatcher = this.findExistingWatcherForQuery({ query })
    if (existingWatcher) return existingWatcher
    else return this.createWatcherForQuery({ query })
  }

  removeWatcherIfNotNeeded = watcherId => {
    const watcher = this.watchers[watcherId]
    if (!watcher) return 'not found'
    if (k(watcher.subscriptions).length) return false
    if (k(watcher.dependents).length) return false
    watcher.dead = true
    watcher.activeDependencies.forEach(dependency => {
      delete dependency.watcher.dependents[watcherId]
      this.removeWatcherIfNotNeeded(dependency.watcher.id)
    })
    delete this.watchers[watcherId]
  }

  killSubscription = subscriptionId => {
    const subscription = this.subscriptions[subscriptionId]
    if (!subscription) return 'not found'
    subscription.dead = true
    delete subscription.watcher.subscriptions[subscriptionId]
    delete this.subscriptions[subscriptionId]
    this.removeWatcherIfNotNeeded(subscription.watcher.id)
  }

  createSubscription = ({ watcher, handler, about }) => {
    const id = `subscription_${this.subscriptionIdCounter++}`

    const subscription = {
      id,
      watcher,
      handler,
      about,
      kill: () => this.killSubscription(id)
    }

    this.subscriptions[id] = subscription
    watcher.subscriptions[id] = subscription
    return subscription
  }

  subscribe({ query, handler }) {
    const givenQuery = query
    if (givenQuery.isGTQuery) query = givenQuery
    else if (typeof givenQuery === 'function') query = createGTFunctionQuery(givenQuery)
    else query = createGTQuery(givenQuery)

    const watcher = this.getWatcherForQuery({ query })
    const subscription = this.createSubscription({ watcher, handler })
    return { subscription, initialValue: watcher.currentValue }
  }
}

export const createGTStore = () => {
  return new GTStore
}

export const createGTStoreConnect = ({ store }) => deriveQueriesFromProps => Component => 
  class GTConnectedComponent extends React.PureComponent {
    state = {
      currentValues: {},
      queries: {},
      subscriptions: {}
    }

    waitingUpdatedState = null
    waitingUpdateTimeout = null

    createSubscriptionHandler = name => updatedValue => {
      const state = this.waitingUpdatedState || this.state
      this.waitingUpdatedState = set(state, { [`currentValues.${name}`]: updatedValue })

      if (this.waitingUpdateTimeout) return
      this.waitingUpdateTimeout = setTimeout(() => {
        this.waitingUpdateTimeout = null
        const updatedState = this.waitingUpdatedState
        this.waitingUpdatedState = null
        this.setState(updatedState)
      })
    }

    updateSubscriptions() {
      const queries = deriveQueriesFromProps(this.props)
      
      const changedQueries = kv(queries, { k:'name', v:'query' })
        .filter(({ name, query }) => {
          const currentQuery = this.state.queries[name]
          if (!currentQuery) return true
          return !currentQuery.equals(query)
        })

      if (!changedQueries.length) return
      
      const updatedState = changedQueries.reduce((updatedState, { name, query }) => {
        const existingSubscription = this.state.subscriptions[name]
        if (existingSubscription) existingSubscription.kill()
        const handler = this.createSubscriptionHandler(name)
        const { subscription, initialValue } = store.subscribe({ query, handler })
        return set(updatedState, {
          [`queries.${name}`]: query,
          [`subscriptions.${name}`]: subscription,
          [`currentValues.${name}`]: initialValue
        })
      }, this.state)

      this.setState(updatedState)
    }

    componentDidUpdate() {
      this.updateSubscriptions()
    }

    componentDidMount() {
      this.updateSubscriptions()
      window.con = this
    }

    render() {
      const { currentValues } = this.state
      return <Component {...this.props} {...currentValues} gt={currentValues}/>
    }
  }