import { OIMChannelService } from '@oimdb/core';
import { todoCns } from './todoCns';
import { todoDb } from './todoDb';

type TTodoCommand = Parameters<typeof todoCns.stimulate>[0];

export function runTodoCommand(command: TTodoCommand): void {
    const channelSlot = todoDb.db.defaultChannelSlot;
    if (!OIMChannelService.INSTANCE.isRefusingWrites(channelSlot)) {
        todoCns.stimulate(command);
        return;
    }
    const unsubscribe = OIMChannelService.INSTANCE.subscribeAfterEachFlush(channelSlot, () => {
        unsubscribe();
        todoCns.stimulate(command);
    });
}
