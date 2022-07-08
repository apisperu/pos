let events = {};

window.varWindow = function (name) {
    Object.defineProperty(window, name, {
        listenerChange: () => { },
        get: () => this._var,
        set: v => {
            this._oldVal = this._var;
            this._var = v;

            if (events[name] && events[name]['set']) {
                if (Array.isArray(events[name]['set'])) {
                    for (const event of events[name]['set']) {
                        if (typeof event === 'function') {
                            event(this._oldVal, v);
                        }
                    }
                }
            }
        }
    });
}

window.varWindowEventListenerSet = (name, cb) => {
    events[name] = events[name] || {};
    events[name]['set'] = events[name]['set'] || [];
    events[name]['set'].push(cb);
}