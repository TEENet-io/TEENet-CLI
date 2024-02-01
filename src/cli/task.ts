import { Command } from 'commander';
import { join } from 'path';
import { Provider, Wallet } from 'ethers';
import { TaskManager } from '../libs/task';
import { Task, Params } from '../libs/types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { LoggerFactory } from './logger';
import { dir, getWallet, printTask, printTaskList, isTaskId, isNodePk, Config, ABIs, files, loadDataFromFile } from './common';
const JSONbig = require('json-bigint');

const logger = LoggerFactory.getInstance();
export function abort(msg: string) {
	logger.log('Aborted: ' + msg || 'Unknown error');
	process.exit(1);
}

type Data = {
	tasks: Record<string, Task>;
	nodeLists: Record<string, string[]>;
}

type RewardReq = {
	id: string;
	pks: string[];
}

// Create non-existing file
const file = join(dir, 'data', files.task)
if (!existsSync(file)) {
	writeFileSync(file, JSON.stringify({ tasks: {}, nodeLists: {} }, null, 2));
}

export class TaskManagerErr {
	public static readonly TaskNotFound = (id: string) => new Error(`Task not found\nid=${id}`);
	public static readonly InvalidId = (id: string) => new Error(`Invalid task id\nid=${id}`);
	public static readonly InvalidPk = (pk: string) => new Error(`Invalid TEE node public key\npk=${pk}`);
	public static readonly EmptyTaskList = () => new Error(`Empty task list`);
	public static readonly LoadTaskDataFailed = (err: string) => new Error(`Failed to load task data\n${err}`);
	public static readonly SaveTaskDataFailed = (err: string) => new Error(`Failed to save task data\n${err}`);
	public static readonly EmptyNodeList = () => new Error(`Empty TEE node list`);
}

/**
* usage: 	teenet	task 	update								// download all task info from blockchain 
 *	 					 	list								// list all tasks					 
 * 						 	get <id>							// get details of a task
 * 							add <addrOrIdx> <file>				// add a task
 * 							join <addOrIdx> <id> <pk>			// join a task
 * 							balance <addrOrIdx>					// get withdraw balance 
 * 							withdraw <addrOrIdx>				// withdraw balance
 * 							reward <addrOrIdx> <file>			// distribute reward
 */

export function addTaskCmd(program: Command, cfg: Config, provider: Provider, abi: ABIs, wallets: Record<string, Wallet>) {
	const taskCmd = program
		.command('task')
		.description('Commands that handle task info');

	taskCmd
		.command('update')
		.description('Update task info')
		.action(() => {
			updateTaskData({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr });
		});

	taskCmd
		.command('list')
		.description('List task info including id, reward, expiring data and node participation info')
		.action(() => {
			listTasks({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr });
		});

	taskCmd
		.command('get <id>')
		.description('Get details of a task')
		.action((id) => {
			if (!isTaskId(id)) {
				abort(TaskManagerErr.InvalidId(id).message);
			}

			getTask({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr }, id);
		});

	taskCmd
		.command('add <addrOrIdx> <file>')
		.description('Add a task')
		.action((addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
			}

			const taskOrErr = loadDataFromFile(file);
			if (taskOrErr instanceof Error) {
				abort(taskOrErr.message);
			}

			// TODO:
			// May add logic to check the validity of loaded task

			addTask({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr }, walletOrErr as Wallet, taskOrErr as Task);
		});
	taskCmd
		.command('join <addrOrIdx> <id> <pk>')
		.description('Join a task')
		.action((addrOrIdx, id, pk) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
				return;
			}

			if (!isTaskId(id)) {
				abort(TaskManagerErr.InvalidId(id).message);
			}

			if (!isNodePk(pk)) {
				abort(TaskManagerErr.InvalidPk(pk).message);
			}

			joinTask({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr }, walletOrErr, id, pk);
		});
	taskCmd
		.command('balance <addrOrIdx>')
		.description('Get withdraw balance')
		.action((addrOrIdx) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
				return;
			}

			new TaskManager({
				provider,
				addr: cfg.deployed.TaskMgr,
				abi: abi.TaskMgr
			}).balance(walletOrErr.address).then((balanceOrErr: bigint | Error) => {
				if (balanceOrErr instanceof Error) {
					abort(balanceOrErr.message);
					return;
				}
				logger.log(`Withdraw balance\nAddress: ${walletOrErr.address}\nBalance: ${Number(balanceOrErr)}`);
			});
		});
	taskCmd
		.command('withdraw <addrOrIdx>')
		.description('Withdraw balance')
		.action((addrOrIdx) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
				return;
			}
			new TaskManager({
				provider,
				addr: cfg.deployed.TaskMgr,
				abi: abi.TaskMgr
			}).withdraw(walletOrErr).then((errOrNull) => {
				if (errOrNull instanceof Error) {
					abort(errOrNull.message);
				}
				logger.log(`Balance withdrawn\nAddress: ${walletOrErr.address}`);
			});
		});
	taskCmd
		.command('reward <addrOrIdx> <file>')
		.description('Distribute reward')
		.action((addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
				return;
			}

			const reqOrErr = loadDataFromFile(file);
			if (reqOrErr instanceof Error) {
				abort(reqOrErr.message);
				return;
			}
			const req = reqOrErr as RewardReq;

			if (!isTaskId(req.id)) {
				abort(TaskManagerErr.InvalidId(req.id).message);
			}
			if (req.pks.length === 0) {
				abort(TaskManagerErr.EmptyNodeList().message);
			}
			req.pks.forEach((pk) => {
				if (!isNodePk(pk)) {
					abort(TaskManagerErr.InvalidPk(pk).message);
				}
			});

			rewardTask({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr }, walletOrErr, req.id, req.pks);
		});
}

function loadTaskData(): Data | Error {
	const file = join(dir, 'data', files.task);

	let data: Data;
	try {
		data = JSON.parse(readFileSync(file, 'utf-8'));
	} catch (err: any) {
		return TaskManagerErr.LoadTaskDataFailed(err.message);
	}
	return data;
}

function saveTaskInfo(data: Data): Error | null {
	const file = join(dir, 'data', files.task);
	try {
		writeFileSync(file, JSONbig.stringify(data, null, 2));
	} catch (err: any) {
		return TaskManagerErr.SaveTaskDataFailed(err.message);
	}
	return null;
}

async function updateTaskData(param: Params) {
	const taskManager = new TaskManager(param);
	const ids = await taskManager.getTaskIds();
	if (ids instanceof Error) {
		abort(ids.message);
	}
	const tasks: Record<string, Task> = {};
	const nodeLists: Record<string, string[]> = {};

	for (const id of ids as string[]) {
		const tasksOrErr = await taskManager.getTask(id);
		if (tasksOrErr instanceof Error) {
			abort(tasksOrErr.message);
			return;
		}
		tasks[tasksOrErr.id] = tasksOrErr;
		const listOrErr = await taskManager.getNodeList(id);
		if (listOrErr instanceof Error) {
			abort(listOrErr.message);
			return;
		}
		if (listOrErr) {
			nodeLists[id] = listOrErr;
		}
	}

	const errOrNull = saveTaskInfo({ tasks, nodeLists });
	if (errOrNull instanceof Error) {
		abort(errOrNull.message);
	}

	logger.log('Updated local task data');
}

async function addTask(param: Params, wallet: Wallet, task: Task) {
	const taskManager = new TaskManager(param);
	const errOrNull = await taskManager.addTask(wallet, task);
	if (errOrNull instanceof Error) {
		abort(errOrNull.message);
	}
	logger.log('Task added');

	const taskOrErr = await taskManager.getTask(task.id);
	if (taskOrErr instanceof Error) {
		abort(taskOrErr.message);
	}
	logger.log(printTask(task));
}

async function joinTask(param: Params, wallet: Wallet, id: string, pk: string) {
	const taskManager = new TaskManager(param);
	const errOrNull = await taskManager.joinTask(wallet, id, pk);
	if (errOrNull instanceof Error) {
		abort(errOrNull.message);
	}

	logger.log(`Joined task\nid=${id}\npk=${pk}`);
}

async function rewardTask(param: Params, wallet: Wallet, id: string, pks: string[]) {
	const taskManager = new TaskManager(param);
	const errOrNull = await taskManager.reward(wallet, id, pks);
	if (errOrNull instanceof Error) {
		abort(errOrNull.message);
	}
	logger.log(`Reward distributed\nid=${id}\npks=${JSON.stringify(pks)}`);
}

async function getTask(params: Params, id: string) {
	const taskManager = new TaskManager(params);
	if (await taskManager.taskExists(id)) {
		const taskOrErr = await taskManager.getTask(id);
		if (taskOrErr instanceof Error) {
			abort(taskOrErr.message);
			return;
		}

		const listOrErr = await taskManager.getNodeList(id);
		if (listOrErr instanceof Error) {
			abort(listOrErr.message);
			return;
		}

		logger.log(printTask(taskOrErr));
		logger.log('Node list: ' + JSON.stringify(listOrErr, null, 2));
	} else {
		abort(TaskManagerErr.TaskNotFound(id).message);
	}
}

async function listTasks(params: Params) {
	const dataOrErr = loadTaskData();
	if (dataOrErr instanceof Error) {
		abort(dataOrErr.message);
		return;
	}

	const output = printTaskList(dataOrErr.tasks, dataOrErr.nodeLists);
	if (output.length === 0) {
		abort(TaskManagerErr.EmptyTaskList().message);
	} else {
		logger.log(output);
	}
}