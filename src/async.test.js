import { Stream } from './index'
import tap from 'tap'



// 
tap.test('> Defer Test', assert => {
    return new Promise(resolve => {
        let count = 0;
        const n = Stream.fromArray([0]);
        const d = n.defer().map(v => ++count);
        d.subscribe(v => assert.equal(v, 1));
        d.subscribe(v => assert.equal(v, 1));
        d.subscribe(v => resolve(v)); 
    });
}).then(assert => {
    // assert.end();
}).catch(tap.threw);


tap.test('> Promise Test', assert => {
    return Stream.fromArray([1, 2, 3, 4]).toPromise().then(v => {
        assert.equal(v.length, 4);
    });
}).then(assert => {
    // assert.end();
}).catch(tap.threw);
