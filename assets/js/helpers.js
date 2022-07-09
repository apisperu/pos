let events = {};

window.varWindow = function (name) {
    Object.defineProperty(window, name, {
        get: () => this['_' + name],
        set: v => {
            if (events[name] && events[name]['set']) {
                if (Array.isArray(events[name]['set'])) {
                    for (const event of events[name]['set']) {
                        if (typeof event === 'function') {
                            event(this['_' + name], v);
                        }
                    }
                }
            }

            this['_' + name] = v;
        }
    });
}

window.varWindowEventListenerSet = (name, cb) => {
    events[name] = events[name] || {};
    events[name]['set'] = events[name]['set'] || [];
    events[name]['set'].push(cb);
}