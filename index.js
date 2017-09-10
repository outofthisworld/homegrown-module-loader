module.exports = global.loader = (function(options) {
    function ModuleLoader() {}

    //Static, accessible only if truly needed through obj.constructor.modules
    //Can also be made completely private by removing the ModuleLoader prefix.
    ModuleLoader.modulesLoaded = 0;
    ModuleLoader.modules = {}
    ModuleLoader.handlers = {
        "before_instance_created": [],
        "after_instance_created": [],
        "before_function_called": [],
        "after_function_called": []
    }

    //Lets hiJack this.
    function hook(module, moduleLoader) {

        const exports = module.context.exports;

        function wrap(fn) {
            return function hiJacked() {
                if (this instanceof hiJacked) {
                    moduleLoader.emit('before_instance_created', [module.context.__moduleName, fn, arguments])
                    const hiJacked = new fn(...arguments);
                    moduleLoader.emit('after_instance_created', [module.context.__moduleName, fn, arguments, hiJacked])
                    return hiJacked;
                } else {
                    moduleLoader.emit('before_function_called', [module.context.__moduleName, fn, arguments])
                    const result = fn.apply(this, arguments);
                    moduleLoader.emit('after_function_called', [module.context.__moduleName, fn, arguments, result])
                    return result;
                }
            }
        }

        if (exports && typeof exports === 'function') {
            const _hiJacked = module.context.exports;
            module.context.exports = wrap(_hiJacked);
        } else if (exports && options.hookAll && Object.prototype.toString.call(exports) === "[object Object]") {
            for (var key in exports) {
                if (Object.prototype.hasOwnProperty.call(exports, key) && typeof exports[key] === "function") {
                    exports[key] = wrap(exports[key])
                }
            }
        }
    }


    ModuleLoader.prototype.define = function(moduleName, dModule) {
        if (moduleName in ModuleLoader.modules) throw new Error('Error, duplicate module');

        const module = ModuleLoader.modules[moduleName] = {
            context: {
                __moduleName: moduleName,
                exports: {}
            }
        }

        module._private = {
            private_sections: new WeakMap(),
            instances: []
        }

        function private(action, instance) {
            switch (action) {
                case "create":
                    if (module._private.private_sections.has(instance)) throw new Error('Cannot create private store twice on the same instance! check calls to create.')
                    module._private.instances.push(instance);
                    module._private.private_sections.set(instance, {});
                    break;
                case "delete":
                    const index = module._private.instances.indexOf(instance);
                    if (index == -1) throw new Error('Invalid state');
                    module._private.instances.slice(index, 1);
                    return module._private.private_sections.delete(instance);
                    break;
                case "get":
                    return module._private.private_sections.get(instance);
                    break;
                default:
                    throw new Error('Invalid action');
                    break;
            }
        }
        module.context.store = private;
        dModule.call(module.context, private);
        hook(module, this);
        ModuleLoader.modulesLoaded++;
    }

    ModuleLoader.prototype.remove = function(moduleName) {
        if (!moduleName in (ModuleLoader.modules)) return;

        /*
            Clean up as best we can.
        */
        const module = ModuleLoader.modules[moduleName];
        module.context.__moduleName = null;
        module.context.exports = null;
        module.cotext = null;
        module._private.instances.forEach(function(instance) { module._private.private_sections.delete(instance) });
        for (let i = 0; i < module._private.instances.length; i++) {
            module._private.instances[i] = undefined;
        }
        module._private.instances = undefined;
        module._private = null;
        delete ModuleLoader.modules[moduleName];
        ModuleLoader.modulesLoaded -= 1;
    }


    ModuleLoader.prototype.require = function(moduleName) {
        if (!(moduleName in ModuleLoader.modules)) throw new Error('Module does not exist');

        return ModuleLoader.modules[moduleName].context.exports;
    }

    ModuleLoader.prototype.emit = function(eventName, args) {
        if (!(eventName in ModuleLoader.handlers)) throw new Error('Invalid event name')

        const self = this;
        ModuleLoader.handlers[eventName].forEach(function(fn) {
            fn.apply(self, args);
        })
    }

    ModuleLoader.prototype.off = function(eventName, cb) {
        if (!(eventName in ModuleLoader.handlers)) throw new Error('Invalid event name')

        let index;
        if ((index = ModuleLoader.handlers[eventName].indexOf(cb)) === -1) return;

        ModuleLoader.handlers[eventName].slice(index, 1);
    }

    ModuleLoader.prototype.on = function(eventName, cb) {
        if (!(eventName in ModuleLoader.handlers)) throw new Error('Invalid event name')

        ModuleLoader.handlers[eventName].push(cb);
    }

    return new ModuleLoader();
})({
    hookAll: true
});