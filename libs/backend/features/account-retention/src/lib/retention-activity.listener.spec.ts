import { AuthEvents } from '@org/backend-auth';
import { RetentionActivityListener } from './retention-activity.listener';

describe('RetentionActivityListener', () => {
  it('calls recordActivity on login and on refresh', () => {
    const authEvents = new AuthEvents();
    const userService = { recordActivity: jest.fn().mockResolvedValue(undefined) };
    const listener = new RetentionActivityListener(
      authEvents,
      userService as never,
    );

    listener.onModuleInit();

    authEvents.emitLoginSucceeded({ userId: 'u1', method: 'password' });
    authEvents.emitSessionRefreshed({ userId: 'u2' });

    expect(userService.recordActivity).toHaveBeenNthCalledWith(1, 'u1');
    expect(userService.recordActivity).toHaveBeenNthCalledWith(2, 'u2');
  });
});
