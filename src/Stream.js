import * as symbols from './symbols'

const { 
    out,
    last,     
    src,   
} = symbols;

// factory for base observables
function Stream(...sources){
    const o = Object.create(Stream.prototype);
    o[last] = undefined;
    o[out] = new Set();
    o[src] = sources;
    return o;
}

// For a combination of redability and
// performance, most operations on streams
// in plumbarius are defined using this
// patch method.
// patch :: Node -> Patch -> Mixin -> Node
// patch function signature:
// (self, next) => (a, b) => { /*/*/ }
function patch(o, p, m){
    Reflect.ownKeys(p).forEach(k => {
        const f = o[k];
        o[k] = p[k](o, f);
    });
    return m ? Object.assign(o, m) : o;
}

export { Stream }
export { patch }