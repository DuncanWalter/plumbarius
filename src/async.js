import { Stream, patch } from './Stream'
import * as symbols from './symbols'
const { push, end, sub, clean } = symbols;

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// deferred nodes will not perform data operations until
// code execution stops. All awaited operations will
// be performed in order. deferred nodes are great for
// efficiently handling multiple subscriptions, cycles, etc.
const deferPatch = { // TODO: these patch objects need to be static, NOT literal
    [push]: (self, next) => (val, src) => {
        DeferQueue.active.add(() => next.call(self, val, src));
    },
    [end]: (self, next) => (src) => {
        DeferQueue.active.add(() => next.call(self, src));
    },
};

// delayed nodes do exactly what you'd imagine- they
// delay data actions by a set amount of time.
const delay = Symbol('delay');
const delayPatch = {
    [push]: (self, next) => (val, src) => {
        setTimeout(() => next.call(self, val, src));
    },
    [end]: (self, next) => (src) => {
        setTimeout(() => next.call(self, src), self[delay]);
    },
};

const debouncePatch = {
    [push]: (self, next) => val => {
        // TODO: 
    }
};

// 
const asyncLib = {
    toPromise(){
        return new Promise(resolve => {
            const sequence = [];
            const self = this;
            const o = {
                [push](val){
                    sequence.push(val);
                },
                [end](){
                    resolve(sequence);
                    self[clean](o);
                },
            };
            this[sub](o);
        });
    },
    defer(){ 
        return patch(Stream(this), deferPatch);
    },
    delay(time){ 
        return patch(Stream(this), delayPatch, { [delay]: time }); 
    },
    // invert // make a pull-able generator that emits promises
};

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

function DeferQueue(){
    const q = Object.create(DeferQueue.prototype);
    q.head = [undefined, undefined];
    q.last = q.head;
    return q;
}


DeferQueue.run = () => {
    const runningQueue = DeferQueue.active;
    DeferQueue.active = DeferQueue();
    runningQueue.runEach(f => f());
};


DeferQueue.prototype = {
    add(v){
        if(this.last == this.head){
            setTimeout(DeferQueue.run);
        }
        this.last[0] = v;
        this.last[1] = [undefined, undefined];
        this.last = this.last[1];
    },
    runEach(f){
        let [v, n] = this.head;
        while(n){
            v();
            ([v, n] = n);
        }
    },
};

DeferQueue.active = DeferQueue();

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

export { asyncLib }