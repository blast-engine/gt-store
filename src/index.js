import React from 'react';
import * as u from '@blast-engine/utils';

export const gt = {};

gt.basicTransitionalStore = () => {
  const store = { _state: {}, _emitter: new u.Emitter() };

  store.state = () => store._state;

  store.subscribe = handler => store._emitter.subscribe(handler);

  store.set = state => {
    store._state = state;
    store._emitter.emit(store._state);
  };

  store.get = path => u.get(store._state, path);

  store.update = update => store.set(u.set(store._state, update));

  store.transition = transition => store.set(transition(store._state));

  return store;
};

gt.store = () =>
  new gt.GTStore({ transitionalStore: gt.basicTransitionalStore() });

// ---

gt.createReduxGTStoreFromCreateReduxStore = createReduxStore => (
  reducer,
  ...rest
) => {
  // @todo: change __GT_TRANSITION_ to __UPDATE__ and the payload should be just the new state, not action
  const gtreducer = (state, action) => {
    if (action.type === '__GT_UPDATE__') return action.newState;
    return { ...state, ...reducer(state, action) };
  };

  const store = createReduxStore(gtreducer, ...rest);

  const transitionalStore = {
    redux: () => store,
    state: () => store.getState(),
    subscribe: handler => store.subscribe(() => handler(store.getState())),
    get: path => u.get(store.getState(), path),
    set: state => store.dispatch({ type: '__GT_UPDATE__', newState: state }),
    update: update => store.gt.set(u.set(store.getState(), update)),
    transition: transition => store.gt.set(transition(store.getState()))
  };

  store.gt = new gt.GTStore({ transitionalStore });

  Object.assign(store, store.gt);

  return store;
};

gt.redux = gt.createReduxGTStoreFromCreateReduxStore;

// ---

// @todo: this state should be somewhere else
let anonymousQueryTypeCounter = 0;
const nextAnonymousQueryId = () =>
  `anonymous_query_type_${anonymousQueryTypeCounter++}`;

gt.createGTQueryFactory = givenDefinition => {
  let definition = u.isFn(givenDefinition)
    ? { deriveValue: givenDefinition }
    : { ...(givenDefinition || {}) };

  if (!u.isFn(definition.argsAreValid)) definition.argsAreValid = () => true;

  if (!u.isFn(definition.valuesAreEquivalent))
    definition.valuesAreEquivalent = ({ value, otherValue }) =>
      u.areShallowEquivalent(value, otherValue);

  if (!u.isFn(definition.argsAreEquivalent)) {
    if (u.isBool(definition.argsAreEquivalent))
      definition.argsAreEquivalent = () => definition.argsAreEquivalent;
    else
      definition.argsAreEquivalent = ({ args, otherArgs }) =>
        u.areShallowEquivalent(args, otherArgs);
  }

  // @todo: this is no longer a pure function because of nextAnonQueryId()
  // nextAnonQueryId function should be passed in
  definition.type = definition.type || nextAnonymousQueryId();

  let dependenciesFn;
  const givenDependencies = definition.dependencies;
  if (u.isFn(givenDependencies)) dependenciesFn = givenDependencies;
  else if (u.isObj(givenDependencies)) dependenciesFn = () => givenDependencies;
  else dependenciesFn = () => {};
  definition.dependencies = dependenciesFn;

  if (!u.isFn(definition.skipCheckIfDependenciesUnchanged)) {
    const scidc = definition.skipCheckIfDependenciesUnchanged;
    definition.skipCheckIfDependenciesUnchanged = () => !!scidc;
  }

  return ({ args = {}, module }) => {
    const query = {
      isGTQuery: true,
      ...definition,
      definition,
      givenDefinition,
      args,
      module
    };

    query.dependencies = ({ args } = {}) =>
      definition.dependencies({ args, module });

    query.equals = ({ otherQuery }) => {
      if (!query.type) return false;
      if (!otherQuery.type) return false;
      if (query.type !== otherQuery.type) return false;

      return definition.argsAreEquivalent({
        args: query.args,
        otherArgs: otherQuery.args
      });
    };

    if (!definition.argsAreValid(({ args } = {}))) {
      const errMsg = `invalid args provided to query ${query.type}`;
      console.error(errMsg, args);
      throw new Error(errMsg);
    }

    return query;
  };
};

gt.query = gt.createGTQueryFactory;

gt.createGTNoArgsQuery = definition =>
  gt.createGTQueryFactory({
    ...definition,
    type: definition.type
  })();

gt.createGTFunctionQuery = deriveValue =>
  gt.createGTNoArgsQuery({
    type: null,
    deriveValue
  });

// ---

gt.transition = transitionFn => transitionFn;

// ---

gt.action = actionFn => actionFn;

// ---

gt.reaction = definition => ({ args, ...rest }) => {
  const _reaction = { definition };

  const handleEvent = value => {
    const shouldDoAction = definition.shouldDoAction({ ...rest, args, value });
    if (shouldDoAction)
      setTimeout(() => definition.doAction({ ...rest, args, value }));
  };

  const start = ({ activeReactions = [] } = {}) => {
    if (_reaction.subscription) return;
    const subscription = definition.start({
      ...rest,
      args,
      emit: handleEvent
    });
    _reaction.subscription = subscription;
    return { activeReactions: [...activeReactions, _reaction] };
  };

  const stop = ({ activeReactions = [] } = {}) => {
    definition.stop({
      ...rest,
      args,
      subscription: _reaction.subscription
    });
    delete _reaction.subscription;
    return { activeReactions: activeReactions.filter(ar => ar !== _reaction) };
  };

  _reaction.argsAndRest = { ...rest, args };
  _reaction.handleEvent = handleEvent;
  _reaction.start = start;
  _reaction.stop = stop;

  return _reaction;
};

// ---

gt.normalizeQuery = ({ query }) => {
  if (query.isGTQuery) return query;
  else if (typeof query === 'function') return gt.createGTFunctionQuery(query);
  else return gt.createGTNoArgsQuery(query);
};

gt.pureSnap = (state, query) => {
  query = gt.normalizeQuery({ query });

  const dependencies = u.objMap(
    query.dependencies({ args: query.args }),
    dependencyQuery => gt.pureSnap({ state, query: dependencyQuery })
  );

  const value = query.deriveValue({
    module: query.module,
    state: state,
    args: query.args,
    deps: dependencies
  });

  return value;
};

gt.GTStore = class GTStore {
  constructor({ transitionalStore }) {
    this.transitionalStore = transitionalStore;
    this.transitionalStore.subscribe(this.updateWatchers);
    this.state = this.transitionalStore.state;
    this.get = this.transitionalStore.get;
    this.set = this.transitionalStore.set;
    this.update = this.transitionalStore.update;
    this.doTransition = this.transitionalStore.doTransition || this.transitionalStore.transition;
  }

  watcherIdCounter = 0;
  watchers = {};
  subscriptionIdCounter = 0;
  subscriptions = {};

  snap = (query, options) => {
    query = gt.normalizeQuery({ query });
    const watcher = this.getWatcherForQuery({ query });
    const value = watcher.currentValue;
    this.removeWatcherIfNotNeeded({ watcherId: watcher.id });
    return value;
  };

  updateWatchers = () => {
    const watcherIdsChecked = {};
    const watchersChanged = [];
    let watcherIdsNotChecked = u.k(this.watchers);
    while (watcherIdsNotChecked.length) {
      let watcherIdsSkippedThisRound = [];
      watcherIdsNotChecked.forEach(watcherId => {
        const watcher = this.watchers[watcherId];

        const depChecks = watcher.activeDependencies.map(({ watcherId }) => ({
          watcherId,
          check: watcherIdsChecked[watcherId]
        }));
        const allDepsChecked = depChecks.every(depCheck => !!depCheck.check);

        if (!allDepsChecked) {
          watcherIdsSkippedThisRound.push(watcherId);
          return;
        }

        if (
          watcher.activeDependencies.length &&
          watcher.query.skipCheckIfDependenciesUnchanged({
            args: watcher.query.args
          })
        ) {
          const someDepChanged = depChecks.some(
            depCheck => !!depCheck.check.changed
          );
          if (!someDepChanged) {
            watcherIdsChecked[watcherId] = { changed: false };
            return;
          }
        }

        const nextValue = this.deriveValueForWatcher({ watcher });

        const valuesAreEquivalent = watcher.query.valuesAreEquivalent({
          value: watcher.currentValue,
          otherValue: nextValue
        });

        if (!valuesAreEquivalent) {
          watcher.currentValue = nextValue;
          watcherIdsChecked[watcherId] = { changed: true };
          watchersChanged.push(watcher);
        } else {
          watcherIdsChecked[watcherId] = { changed: false };
        }
      });
      watcherIdsNotChecked = watcherIdsSkippedThisRound;
    }

    watchersChanged.forEach(watcher => {
      u.v(watcher.subscriptions).forEach(s => s.handler({ value: watcher.currentValue }));
    });
  };

  findExistingWatcherForQuery = ({ query }) => {
    const existingWatcher = u.v(this.watchers).find(watcher => {
      return watcher.query.equals({ otherQuery: query });
    });
    return existingWatcher || null;
  };

  deriveValueForWatcher = ({ watcher }) => {
    const dependencyCurrentValues = u.rollup({
      array: watcher.activeDependencies,
      deriveValue: ad => ad.watcher.currentValue,
      deriveKey: ad => ad.dependency.name
    });

    const value = watcher.query.deriveValue({
      module: watcher.query.module,
      state: this.state(),
      args: watcher.query.args,
      deps: dependencyCurrentValues
    });

    return value;
  };

  createWatcherForQuery = ({ query }) => {
    const id = `watcher_${this.watcherIdCounter++}`;

    const activeDependencies = u
      .kv(query.dependencies({ args: query.args }))
      .map(pair => {
        const dependency = { name: pair.k, query: pair.v };
        const watcher = this.getWatcherForQuery({ query: dependency.query });
        return { watcher, watcherId: watcher.id, dependency };
      });

    const watcher = {
      id,
      query,
      activeDependencies,
      subscriptions: {},
      dependents: {}
    };

    activeDependencies.forEach(ad => {
      ad.watcher.dependents[id] = watcher;
    });

    const initialValue = this.deriveValueForWatcher({ watcher });
    watcher.currentValue = initialValue;

    this.watchers[id] = watcher;
    return watcher;
  };

  getWatcherForQuery = ({ query }) => {
    const existingWatcher = this.findExistingWatcherForQuery({ query });
    if (existingWatcher) return existingWatcher;
    else return this.createWatcherForQuery({ query });
  };

  removeWatcherIfNotNeeded = ({ watcherId }) => {
    const watcher = this.watchers[watcherId];
    if (!watcher) return 'not found';
    if (u.k(watcher.subscriptions).length) return false;
    if (u.k(watcher.dependents).length) return false;
    watcher.dead = true;
    watcher.activeDependencies.forEach(dependency => {
      delete dependency.watcher.dependents[watcherId];
      this.removeWatcherIfNotNeeded({ watcherId: dependency.watcher.id });
    });
    delete this.watchers[watcherId];
  };

  killSubscription = ({ subscriptionId }) => {
    const subscription = this.subscriptions[subscriptionId];
    if (!subscription) return 'not found';
    subscription.dead = true;
    delete subscription.watcher.subscriptions[subscriptionId];
    delete this.subscriptions[subscriptionId];
    this.removeWatcherIfNotNeeded({ watcherId: subscription.watcher.id });
  };

  createSubscription = ({ watcher, handler, about }) => {
    const id = `subscription_${this.subscriptionIdCounter++}`;

    const subscription = {
      id,
      watcher,
      handler,
      about,
      kill: () => this.killSubscription({ subscriptionId: id })
    };

    this.subscriptions[id] = subscription;
    watcher.subscriptions[id] = subscription;
    return subscription;
  };

  subscribeToQuery = ({ query, handler }) => {
    query = gt.normalizeQuery({ query });
    const watcher = this.getWatcherForQuery({ query });
    const subscription = this.createSubscription({ watcher, handler });
    return { subscription, initialValue: watcher.currentValue };
  };

  connect = deriveQueriesFromProps => Component => {
    const store = this;
    return class GTConnectedComponent extends React.PureComponent {
      state = {
        currentValues: {},
        queries: {},
        subscriptions: {}
      };

      waitingUpdatedState = null;
      waitingUpdateTimeout = null;

      createSubscriptionHandler = ({ name }) => ({ value }) => {
        const state = this.waitingUpdatedState || this.state;
        this.waitingUpdatedState = u.set(state, {
          [`currentValues.${name}`]: value
        });

        if (this.waitingUpdateTimeout) return;
        this.waitingUpdateTimeout = setTimeout(() => {
          this.waitingUpdateTimeout = null;
          const updatedState = this.waitingUpdatedState;
          this.waitingUpdatedState = null;
          this.setState(updatedState);
        });
      };

      updateSubscriptions() {
        const queries = deriveQueriesFromProps({ props: this.props });

        const changedQueries = u
          .kv(queries, { k: 'name', v: 'query' })
          .filter(({ name, query }) => {
            const currentQuery = this.state.queries[name];
            if (!currentQuery) return true;
            const diff = !currentQuery.equals({ otherQuery: query });
            console.log(diff)
          });

        if (!changedQueries.length) return;
        console.log(changedQueries);
        const updatedState = changedQueries.reduce(
          (updatedState, { name, query }) => {
            const existingSubscription = this.state.subscriptions[name];
            if (existingSubscription) existingSubscription.kill();
            const handler = this.createSubscriptionHandler({ name });
            const { subscription, initialValue } = store.subscribeToQuery({
              query,
              handler
            });
            return u.set(updatedState, {
              [`queries.${name}`]: query,
              [`subscriptions.${name}`]: subscription,
              [`currentValues.${name}`]: initialValue
            });
          },
          this.state
        );

        this.setState(updatedState);
      }

      componentDidUpdate() {
        this.updateSubscriptions();
      }

      componentDidMount() {
        window.c = this
        this.updateSubscriptions();
      }

      render() {
        const { currentValues } = this.state;
        return (
          <Component {...this.props} {...currentValues} gt={currentValues} />
        );
      }
    };
  };
};

// ------

gt.normalizeModuleDefinition = definition => ({
  name: definition.name,
  queries: definition.queries || []
});

gt.module = definition => {
  const model = {};
  const pureModule = {};

  model.get = (state, path) => u.get(state[definition.name], path);

  model.modularizeUpdate = update =>
    u.kvr(
      u.kv(update).map(({ k: path, v: value }) => ({
        k: `${definition.name}.${path}`,
        v: value
      }))
    );

  model.update = (state, update) =>
    u.set(state, model.modularizeUpdate(update));

  model.queries = u.kvr(
    u.kv(definition.queries).map(({ k: name, v: queryCreator }) => {
      const moduleWrappedQueryCreator = ({ args, options } = {}) =>
        queryCreator({
          args,
          options,
          module: pureModule,
          snap: gt.pureSnap
        });
      return { k: name, v: moduleWrappedQueryCreator };
    })
  );

  model.transitions = u.kvr(
    u.kv(definition.transitions).map(({ k: name, v: transition }) => {
      const moduleWrappedTransition = ({ args, options } = {}) =>
        transition({
          args,
          options,
          module: pureModule,
          snap: gt.pureSnap
        });
      return { k: name, v: moduleWrappedTransition };
    })
  );

  model.provision = provisions => {
    const controller = { provisions };
    const provisionedModule = {};

    controller.get = path => model.get(provisions.store.state(), path);

    controller.update = update => 
      provisions.store.update(model.modularizeUpdate(update));

    controller.queries = u.kvr(
      u.kv(definition.queries).map(({ k: name, v: queryCreator }) => {
        const provisionedQueryCreator = (args, options) =>
          queryCreator({
            args,
            options,
            module: pureModule,
            services: provisions.services
          });
        return { k: name, v: provisionedQueryCreator };
      })
    );

    controller.transitions = u.kvr(
      u.kv(definition.transitions).map(({ k: name, v: transition }) => {
        const provisionedTransition = (args, options) =>
          transition({
            args,
            options,
            services: provisions.services
          });
        return { k: name, v: provisionedTransition };
      })
    );

    controller.getters = u.kvr(
      u.kv(model.queries).map(({ k: name, v: query }) => ({
        k: name,
        v: (args, options) => provisions.store.snap(query(args, options))
      }))
    );

    controller.actions = {
      ...u.kvr(
        u.kv(model.transitions).map(({ k: name, v: transition }) => ({
          k: name,
          v: (args, options) =>
            provisions.store.doTransition(state =>
              transition({
                args,
                options,
                state,
                services: provisions.services
              })
            )
        }))
      ),
      ...u.kvr(
        u.kv(definition.actions).map(({ k: name, v: action }) => ({
          k: name,
          v: (args, options) =>
            action({
              args,
              options,
              store: provisions.store,
              module: provisionedModule,
              snap: provisions.store.snap,
              services: provisions.services
            })
        }))
      )
    };

    controller.init = async (args, options) => {
      if (!definition.init) return null;
      return definition.init({
        args,
        options,
        store: provisions.store,
        module: provisionedModule,
        snap: provisions.store.snap,
        services: provisions.services
      });
    };

    const activeReactions = {};
    activeReactions.current = [];
    controller.activeReactions = activeReactions;

    controller.reactions = u.kvr(
      u.kv(definition.reactions).map(({ k: name, v: reaction }) => ({
        k: name,
        v: ({ args, options } = {}) =>
          reaction({
            args,
            options,
            store: provisions.store,
            module: provisionedModule,
            snap: provisions.store.snap,
            services: provisions.services
          })
      }))
    );

    controller.startReactions = (reactionArgs = {}) => {
      u.kv(controller.reactions).forEach(({ k: name, v: reactionCreator }) => {
        const reaction = reactionCreator({
          args: reactionArgs[name],
          store: provisions.store,
          module: provisionedModule,
          snap: provisions.store.snap,
          services: provisions.services
        });
        const { activeReactions } = reaction.start({
          activeReactions: controller.activeReactions.current
        });
        controller.activeReactions.current = activeReactions;
      });
      return controller.activeReactions;
    };

    controller.stopReactions = givenReactionsToStop => {
      if (givenReactionsToStop && !u.isArr(givenReactionsToStop))
        givenReactionsToStop = [givenReactionsToStop];

      const { notStoppedReactions } = controller.activeReactions.current.reduce(
        (acc, activeReaction) => {
          const shouldStopReaction =
            !givenReactionsToStop ||
            givenReactionsToStop.find(grts => {
              if (typeof grts === 'string')
                return activeReaction.definition.name === grts;
              else return activeReaction === grts;
            });

          if (!shouldStopReaction)
            return {
              ...acc,
              notStoppedReactions: acc.notStoppedReactions.concat(
                activeReaction
              )
            };

          activeReaction.stop();

          return {
            ...acc,
            stoppedReactions: acc.stoppedReactions.concat(activeReaction)
          };
        },
        {
          stoppedReactions: [],
          notStoppedReactions: []
        }
      );

      controller.activeReactions.current = notStoppedReactions;
    };

    Object.assign(provisionedModule, {
      ...definition,
      ...model,
      ...controller,
      definition,
      model,
      controller
    });

    return provisionedModule;
  };

  Object.assign(pureModule, {
    ...definition,
    ...model,
    definition,
    model
  });

  return pureModule;
};
