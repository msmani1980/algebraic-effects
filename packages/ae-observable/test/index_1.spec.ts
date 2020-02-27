
import createObservable, { Subscription } from '../src';
// import { resolveAfter } from '../src/fns';

// @ts-ignore
const Promise = window.Promise;

describe('Observable', () => {
  it('should subscribe to observable correctly', done => {
    const obs = createObservable<number>((subscription: Subscription) => {
      subscription.complete({ value: 'Hello' });
    });

    obs.subscribe({
      onError: done,
      onNext: () => done('Not called here'),
      onComplete: (sub: Subscription, { value }) => {
        expect(sub.isCancelled).toBe(false);
        expect(value).toBe('Hello');
        done();
      },
    });
  });

  it('should subscribe to streamed data correctly', done => {
    const onNext = jest.fn();
    const obs = createObservable<number>((subscription: Subscription) => {
      subscription.next(1);
      subscription.next(3);
      subscription.complete();
    });

    obs.subscribe({
      onError: done,
      onNext,
      onComplete: () => {
        expect(onNext).toBeCalledTimes(2);
        expect(onNext.mock.calls).toEqual([[1], [3]]);
        done();
      },
    });
  });

  it('should go to stream error on throw error', done => {
    const onError = jest.fn();
    const onNext = jest.fn();

    const obs = createObservable<number>((subscription: Subscription) => {
      subscription.next(1);
      subscription.throwError(5);
      subscription.next(2);
      subscription.throwError(6);
      subscription.complete();
    });

    obs
      .map(x => x + 10)
      .subscribe({
        onError,
        onNext,
        onComplete: () => {
          expect(onNext).toBeCalledTimes(2);
          expect(onNext).toHaveBeenCalledWith(11);
          expect(onNext).toHaveBeenCalledWith(12);

          expect(onError).toBeCalledTimes(2);
          expect(onError).toHaveBeenCalledWith(5);
          expect(onError).toHaveBeenCalledWith(6);
          done();
        },
      });
  });

  describe('Observable#map', () => {
    
    it('should map over the items in the stream (increment)', done => {
      const onNext = jest.fn();
      const obs = createObservable<number>((subscription: Subscription) => {
        subscription.next(1);
        subscription.next(3);
        subscription.next(10);
        subscription.complete();
      });

      obs
        .map(x => x + 10)
        .subscribe({
          onError: done,
          onNext,
          onComplete: () => {
            expect(onNext).toBeCalledTimes(3);
            expect(onNext.mock.calls).toEqual([[11], [13], [20]]);
            done();
          },
        });
    });

    it('should not map over the error in the stream (increment)', done => {
      const onError = jest.fn();
      const onNext = jest.fn();

      const error = new Error('Fuck');
      const obs = createObservable<number>((subscription: Subscription) => {
        subscription.throwError(error);
        subscription.complete();
      });

      obs
        .map(x => x + 10)
        .subscribe({
          onError,
          onNext,
          onComplete: () => {
            expect(onNext).toBeCalledTimes(0);
            expect(onError).toBeCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(error);
            done();
          },
        });
    });
  });

  describe('Observable#fold', () => {
    it('should fold the items in the stream (increment both error and value)', done => {
      const onNext = jest.fn();
      const obs = createObservable<number, number>((subscription: Subscription) => {
        subscription.next(1);
        subscription.next(3);
        subscription.throwError(10);
        subscription.throwError(5);
        subscription.complete();
      });

      obs
        .fold(e => e + 10, x => x + 3)
        .subscribe({
          onError: done,
          onNext,
          onComplete: () => {
            expect(onNext).toBeCalledTimes(4);
            expect(onNext.mock.calls).toEqual([[4], [6], [20], [15]]);
            done();
          },
        });
    });

    it('should fold the items in the stream (group both error and value)', done => {
      const onNext = jest.fn();
      const obs = createObservable<Error, string>((subscription: Subscription) => {
        subscription.next('Hello');
        subscription.throwError(new Error('Break'));
        subscription.next('world');
        subscription.complete();
      });

      obs
        .fold(e => ({ error: e.message }), x => ({ str: x }))
        .subscribe({
          onError: done,
          onNext,
          onComplete: () => {
            expect(onNext).toBeCalledTimes(3);
            expect(onNext.mock.calls).toEqual([
              [{ str: 'Hello' }],
              [{ error: 'Break' }],
              [{ str: 'world' }],
            ]);
            done();
          },
        });
    });
  });
});

