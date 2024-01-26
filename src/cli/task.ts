import { files } from './types';
import { JsonRpcProvider } from 'ethers';
import { TaskManager } from '../libs/task';
import { Task } from '../libs/types';
import * as fs from 'fs';
import { LoggerFactory } from './Logger';

const logger = LoggerFactory.getInstance();

export async function taskUpdate(provider: JsonRpcProvider, addr: string, abi: any[]) {
	const taskManager = new TaskManager({provider, addr, abi});
	const ids = await taskManager.getTaskIds();
	if (ids instanceof Error) {
		throw new Error(ids.message);
	}
	const tasks: Record<string, Task> = {};
	
	for (const id of ids) {
		const task = await taskManager.getTask(id);
		if (task instanceof Error) {
			throw new Error(task.message);
		}
		tasks[task.id] = task;
	}

	fs.writeFileSync(files.task, JSON.stringify(tasks, null, 2));
}