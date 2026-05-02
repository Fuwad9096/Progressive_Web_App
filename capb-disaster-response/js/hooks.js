/**
 * React-like Hooks for Vanilla JavaScript
 * Manages component state and side effects
 */

class StateHook {
  constructor(componentId) {
    this.componentId = componentId;
    this.state = {};
    this.effects = [];
    this.subscriptions = [];
    this.mounted = false;
  }

  /**
   * useState equivalent
   */
  useState(initialValue) {
    const key = `state_${this.effects.length}`;
    
    if (!(key in this.state)) {
      this.state[key] = typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    const setState = (newValue) => {
      const value = typeof newValue === 'function' ? newValue(this.state[key]) : newValue;
      this.state[key] = value;
    };

    return [this.state[key], setState];
  }

  /**
   * useEffect equivalent
   */
  useEffect(callback, dependencies = []) {
    const effectId = this.effects.length;
    
    if (!this.mounted) {
      this.effects[effectId] = { callback, dependencies, lastDeps: null };
      return;
    }

    const effect = this.effects[effectId];
    const shouldRun = !effect.lastDeps || !this.depsEqual(dependencies, effect.lastDeps);

    if (shouldRun) {
      const cleanup = callback();
      if (typeof cleanup === 'function') {
        effect.cleanup = cleanup;
      }
      effect.lastDeps = dependencies;
    }
  }

  /**
   * useSelector - subscribe to state manager
   */
  useSelector(selector) {
    const [value, setValue] = this.useState(selector(stateManager.getStateSnapshot()));

    if (!this.mounted) {
      this.subscriptions.push(
        stateManager.subscribe((state) => {
          setValue(selector(state));
        })
      );
    }

    return value;
  }

  /**
   * useDispatch - get dispatch functions
   */
  useDispatch() {
    return {
      assignResponder: (responderId, patientId) => 
        stateManager.assignResponderToPatient(responderId, patientId),
      acceptAssignment: (responderId) => 
        stateManager.acceptAssignment(responderId),
      completeAssignment: (responderId) => 
        stateManager.completeAssignment(responderId),
      updateResponder: (responderId, updates) => 
        stateManager.updateResponder(responderId, updates),
      updatePatient: (patientId, updates) => 
        stateManager.updatePatient(patientId, updates),
      broadcast: (message, priority) => 
        stateManager.broadcast(message, priority),
    };
  }

  /**
   * Helper functions
   */
  depsEqual(deps1, deps2) {
    if (!deps1 || !deps2) return false;
    if (deps1.length !== deps2.length) return false;
    return deps1.every((dep, i) => dep === deps2[i]);
  }

  mount() {
    this.mounted = true;
    this.effects.forEach(effect => {
      if (effect && !effect.lastDeps) {
        const cleanup = effect.callback();
        if (typeof cleanup === 'function') {
          effect.cleanup = cleanup;
        }
        effect.lastDeps = effect.dependencies;
      }
    });
  }

  unmount() {
    this.effects.forEach(effect => {
      if (effect && typeof effect.cleanup === 'function') {
        effect.cleanup();
      }
    });
    this.subscriptions.forEach(unsubscribe => unsubscribe());
  }
}

// Component registry
const componentRegistry = new Map();

function createComponent(componentId, initializer) {
  const hook = new StateHook(componentId);
  componentRegistry.set(componentId, hook);
  
  // Initialize component
  const element = initializer(hook);
  
  hook.mount();
  
  return {
    element,
    hook,
    cleanup: () => hook.unmount(),
  };
}

function getComponent(componentId) {
  return componentRegistry.get(componentId);
}