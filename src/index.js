import { asyncLib } from './async'
import { Stream, patch } from './Stream'

import * as symbols from './symbols'

const { 
    out,   
    push,  
    clean, 
    sub,   
    last,  
    end,   
    src,   
    use,   
} = symbols;

const id = i => i;
const fun = Symbol('fun');
const ini = Symbol('ini');

const mapPatch = {
    [push]: (self, next) => val => {
        next.call(self, self[fun](val), self);
    },
};

const filterPatch = {
    [push]: (self, next) => val => {
        if(self[fun](val)){
            next.call(self, val, self);
        }
    },
};

const scanPatch = {
    [push]: (self, next) => (val, src) => {
        if(src != self){
            self[ini] = self[fun](self[ini], val);
        }
        next.call(self, self[ini], self);
    },
    [end]: (self, next) => ( ) => {
        self[push](self[ini], self);
        next.call(self);
    },
};

const reducePatch = {
    [push]: (self, next) => (val, src) => {
        if(src == self){
            next.call(self, self[ini], self);
        } else {
            self[ini] = self[fun](self[ini], val);
        }
    },
    [end]: (self, next) => ( ) => {
        self[push](self[ini], self);
        next.call(self);
    },
};

const iteratePatch = {
    [push]: (self, next) => val => {
        const gen = val[Symbol.iterator]();
        let { value, done } = gen.next();
        while(!done){
            next.call(self, value, self);
            ({ value, done } = gen.next());
        }
    }
}

Stream.prototype = Object.assign(Object.create(null), {
    [push](val, src){
        this[last] = val;
        this[out].forEach(o => o[push](val, this));
    },
    [end](obs){
        // TODO: only end from one source if applicable
        this[out].forEach(o => o[end]());
        this[out].clear(); // TODO: may be a bad idea...
        this[src].forEach(s => s[clean](this));
    },
    [sub](obs){
        const e = !this[out].size;
        this[out].add(obs);
        let self = this;
        if (e) this[src].forEach(s => s[sub](this));
    },
    [clean](obs){
        this[out].delete(obs);
        if(!this[out].size){
            this[src].forEach(s => s[clean](this));
        }
    },
    [use](obs){
        this[src].push(obs);
    },
    subscribe(f){
        const self = this;
        const o = {
            [push]: f,
            [end]: () => self[clean](o),
        };
        this[sub](o);
        return () => o[end]();
    }, 
    terminate(){
        this[end]();
    },
    map(mapping){
        return patch(Stream(this), mapPatch, { 
            [fun]: mapping,
        });
    },
    filter(predicate){
        return patch(Stream(this), filterPatch, { 
            [fun]: predicate, 
        });
    },
    scan(join, accumulator){
        return patch(Stream(this), scanPatch, {
            [fun]: join,
            [ini]: accumulator,
        });
    },
    reduce(join, accumulator){
        return patch(Stream(this), reducePatch, {
            [fun]: join,
            [ini]: accumulator,
        });
    },
    seed(value){
        this[last] = value;
        return this;
    },
    iterate(){
        return patch(Stream(this), iteratePatch);
    },
    // memoize(){

    // },
    // debounce // Date-stamps
    distinct(){
        return this.filter(v => self[last] !== v);
    }, 

}, asyncLib);


// combine latest, but cooler
Stream.computed = (...observables/*/, computation/*/) => {
    const computation = observables.pop();
    // const join = Stream(...observables.map(o => o.filter(v => v !== o.value)));
    const map = new Map();
    observables.forEach(o => map.set(o, o[last]));
    return patch(Stream(...observables), {
        [push]: (self, next) => (val, src) => {
            if(map.get(src) !== val){
                map.set(src, val);
                next.call(self, computation(...map.values()));
            }
        },
        [sub]: (self, next) => obs => {
            next.call(self, obs);
            if(self[out].size == 1){
                self.seed(computation(...map.values()));
                obs[push](self[last], self);
            }
        },
    });

};

Stream.fromArray = (arr) => {
    // TODO: patch notation for clarity
    const o = Stream();
    const s = o[sub];
    o[sub] = obs => {
        s.call(o, obs);
        arr.forEach(v => o[push](v, arr));
        o[end]();
    };
    return o;
};

Stream.fromEvent = (emitter, type) => {
    const stream = Stream();
    const handler = event => stream[push](event);
    return patch(stream, {
        [sub]: (self, next) => obs => {
            if(!self[out].size){
                emitter.addEventListener(type, handler);
            }
            next.call(self, obs);
        },
        [clean]: (self, next) => obs => {
            next.call(self, obs);
            if(!self[out].size){
                emitter.removeEventListener(type, handler);
            }
        },
        // [end]: (self, next) => ( ) => {
        //     console.log('ENDING');
        //     emitter.removeEventListener(type, handler);
        //     next.call(self);
        // },
    });
};

// from iterable
// from promise

export { Stream }
