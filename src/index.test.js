import { Stream } from './index.js'
import tap from 'tap'

import './async.test'

function emitter(assert, defaultHandler){
    return {
        addEventListener(event, handler){
            assert.equal(event, 'simulated');
            this.handler = handler;
        },
        ping(e){
            this.handler(e);
        },
        removeEventListener(event, handler){
            assert.equal(handler, this.handler);
            assert.equal(event, 'simulated');
            this.handler = defaultHandler;             
        },
        handler: defaultHandler,
    };
};

// assert that data streams from array Streams
// intact. TODO: check the replay.
tap.test('> Array Constructor Test', assert => {
    Stream.fromArray([1, 2, 3, 4]).reduce((a, v) => a + v, 0).subscribe(v => {
        assert.equal(v, 10);
        assert.end();
    });
});

// create a fake event emitter and
// and assert that the proper handlers are
// being called on it as an event stream is
// created, subscribed to, terminated,
// reopened, and terminated again.
tap.test('> Event Constructor Test', assert => {
    let unhandled = 0;
    let handled = 0;
    const target = emitter(assert, e => unhandled++);
    const eventStream = Stream.fromEvent(target, 'simulated');
    // check that the subscription is cold
    target.ping(1);
    assert.equal(unhandled, 1);

    eventStream.subscribe(e => {
        assert.equal(e, 5);
        handled++;
    });
    // check that the new handler is working
    target.ping(5);
    assert.equal(handled, 1);
    
    eventStream.terminate();
    // check that the subscription is cold again
    target.ping(1);
    assert.equal(unhandled, 2);

    let terminate = eventStream.subscribe(e => {
        assert.equal(e, 6);
        handled++;
    });

    target.ping(6);

    terminate();

    target.ping(1);

    assert.end();

});

// 
tap.test('> Computed Constructor Test', assert => {
    const e1 = emitter(assert, i => i);
    const e2 = emitter(assert, i => i);
    const c = Stream.computed(
        Stream.fromEvent(e1, 'simulated').seed(1), 
        Stream.fromEvent(e2, 'simulated').seed(2), 
        (a, b) => a + b,
    );
    let sum = 3;
    const end = c.subscribe(v => assert.equal(sum, v));
    sum = 5;
    e1.ping(3);
    sum = 4;
    e1.ping(3);
    e2.ping(1);
    end();
    e1.ping(7);
    assert.end();
});





