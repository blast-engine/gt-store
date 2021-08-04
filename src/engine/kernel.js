import React from 'react'

import * as u from '@blast-engine/utils'
import { crateBasicTransitionalStore } from './transitional-store'

export const createKernelWithBasicStore = () => {
  const transitionalStore = crateBasicTransitionalStore()
  return new GTKernel({ transitionalStore })
}

export class GTKernel {
  constructor({ transitionalStore }) {
    this.transitionalStore = transitionalStore
    this.transitionalStore.subscribe(this.updateWatchers)
    this.state = this.transitionalStore.state
    this.get = this.transitionalStore.get
    this.set = this.transitionalStore.set
    this.update = this.transitionalStore.update
    const _doTransition = this.transitionalStore.doTransition || this.transitionalStore.transition
    this.transition = _doTransition
    this.apply = transition => _doTransition(state => transition.apply({ state }))
    this.apply = transition => _doTransition(state => transition.apply({ state }))
  }

  watcherIdCounter = 0
  watchers = {}
  subscriptionIdCounter = 0
  subscriptions = {}

  snap = (query, options) => {
    const watcher = this.getWatcherForQuery({ query })
    const value = watcher.currentValue
    this.removeWatcherIfNotNeeded({ watcherId: watcher.id })
    return value
  }

  updateWatchers = () => {
    const watcherIdsChecked = {}
    const watchersChanged = []
    let watcherIdsNotChecked = u.k(this.watchers)
    while (watcherIdsNotChecked.length) {
      let watcherIdsSkippedThisRound = []
      watcherIdsNotChecked.forEach(watcherId => {
        const watcher = this.watchers[watcherId]

        const depChecks = watcher.activeDependencies.map(({ watcherId }) => ({
          watcherId,
          check: watcherIdsChecked[watcherId]
        }))
        const allDepsChecked = depChecks.every(depCheck => !!depCheck.check)

        if (!allDepsChecked) {
          watcherIdsSkippedThisRound.push(watcherId)
          return
        }

        if (
          watcher.activeDependencies.length &&
          watcher.query.skipCheckIfDependenciesUnchanged({
            args: watcher.query.args
          })
        ) {
          const someDepChanged = depChecks.some(
            depCheck => !!depCheck.check.changed
          )
          if (!someDepChanged) {
            watcherIdsChecked[watcherId] = { changed: false }
            return
          }
        }

        const nextValue = this.deriveValueForWatcher({ watcher })

        const valuesAreEquivalent = watcher.query.valuesAreEquivalent({
          value1: watcher.currentValue,
          value2: nextValue
        })

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
      u.v(watcher.subscriptions).forEach(s => s.handler({ value: watcher.currentValue }))
    })
  }

  findExistingWatcherForQuery = ({ query }) => {
    const existingWatcher = u.v(this.watchers).find(watcher => {
      return watcher.query.isEquivalent({ query })
    })
    return existingWatcher || null
  }

  deriveValueForWatcher = ({ watcher }) => {
    const dependencyCurrentValues = u.rollup({
      array: watcher.activeDependencies,
      deriveValue: ad => ad.watcher.currentValue,
      deriveKey: ad => ad.dependency.name
    })

    const value = watcher.query.deriveValue({
      state: this.state(),
      dependencyValues: dependencyCurrentValues
    })

    return value
  }

  createWatcherForQuery = ({ query }) => {
    const id = `watcher_${this.watcherIdCounter++}`

    const activeDependencies = u
      .kv(query.dependencies)
      .map(pair => {
        const dependency = { name: pair.k, query: pair.v }
        const watcher = this.getWatcherForQuery({ query: dependency.query })
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

    const initialValue = this.deriveValueForWatcher({ watcher })
    watcher.currentValue = initialValue

    this.watchers[id] = watcher
    return watcher
  }

  getWatcherForQuery = ({ query }) => {
    const existingWatcher = this.findExistingWatcherForQuery({ query })
    if (existingWatcher) return existingWatcher
    else return this.createWatcherForQuery({ query })
  }

  removeWatcherIfNotNeeded = ({ watcherId }) => {
    const watcher = this.watchers[watcherId]
    if (!watcher) return 'not found'
    if (u.k(watcher.subscriptions).length) return false
    if (u.k(watcher.dependents).length) return false
    watcher.dead = true
    watcher.activeDependencies.forEach(dependency => {
      delete dependency.watcher.dependents[watcherId]
      this.removeWatcherIfNotNeeded({ watcherId: dependency.watcher.id })
    })
    delete this.watchers[watcherId]
  }

  killSubscription = ({ subscriptionId }) => {
    const subscription = this.subscriptions[subscriptionId]
    if (!subscription) return 'not found'
    subscription.dead = true
    delete subscription.watcher.subscriptions[subscriptionId]
    delete this.subscriptions[subscriptionId]
    this.removeWatcherIfNotNeeded({ watcherId: subscription.watcher.id })
  }

  createSubscription = ({ watcher, handler, about }) => {
    const id = `subscription_${this.subscriptionIdCounter++}`

    const subscription = {
      id,
      watcher,
      handler,
      about,
      kill: () => this.killSubscription({ subscriptionId: id })
    }

    this.subscriptions[id] = subscription
    watcher.subscriptions[id] = subscription
    return subscription
  }

  subscribeToQuery = ({ query, handler }) => {
    const watcher = this.getWatcherForQuery({ query })
    const subscription = this.createSubscription({ watcher, handler })
    return { subscription, initialValue: watcher.currentValue }
  }

  connect = deriveQueriesFromProps => Component => {
    const store = this
    return class GTConnectedComponent extends React.PureComponent {
      state = {
        currentValues: {},
        queries: {},
        subscriptions: {}
      }

      waitingUpdatedState = null
      waitingUpdateTimeout = null

      createSubscriptionHandler = ({ name }) => ({ value }) => {
        const state = this.waitingUpdatedState || this.state
        this.waitingUpdatedState = u.set(state, {
          [`currentValues.${name}`]: value
        })

        if (this.waitingUpdateTimeout) return
        this.waitingUpdateTimeout = setTimeout(() => {
          this.waitingUpdateTimeout = null
          const updatedState = this.waitingUpdatedState
          this.waitingUpdatedState = null
          this.setState(updatedState)
        })
      }

      updateSubscriptions() {
        const queries = deriveQueriesFromProps({ props: this.props })

        const changedQueries = u
          .kv(queries, { k: 'name', v: 'query' })
          .filter(({ name, query }) => {
            const currentQuery = this.state.queries[name]
            if (!currentQuery) return true
            const diff = !currentQuery.isEquivalent({ query })
            console.log(diff)
          })

        if (!changedQueries.length) return
        console.log(changedQueries)
        const updatedState = changedQueries.reduce(
          (updatedState, { name, query }) => {
            const existingSubscription = this.state.subscriptions[name]
            if (existingSubscription) existingSubscription.kill()
            const handler = this.createSubscriptionHandler({ name })
            const { subscription, initialValue } = store.subscribeToQuery({
              query,
              handler
            })
            return u.set(updatedState, {
              [`queries.${name}`]: query,
              [`subscriptions.${name}`]: subscription,
              [`currentValues.${name}`]: initialValue
            })
          },
          this.state
        )

        this.setState(updatedState)
      }

      componentDidUpdate() {
        this.updateSubscriptions()
      }

      componentDidMount() {
        window.c = this
        this.updateSubscriptions()
      }

      render() {
        const { currentValues } = this.state
        return (
          <Component {...this.props} {...currentValues} gt={currentValues} />
        )
      }
    }
  }
}