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

export function addTaskCmd(
	program: Command,
	cfg: Config,
	provider: Provider,
	abi: ABIs,
	wallets: Record<string, Wallet>
): Command {
	const taskCmd = program
		.command('task')
		.description('Commands that handle task info');

	taskCmd
		.command('update')
		.description('Update task info')
		.action(async () => {
			try {
				await updateTaskData({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				});
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	taskCmd
		.command('list')
		.description('List task info including id, reward, expiring data and node participation info')
		.action(async () => {
			try {
				await listTasks({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				});
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	taskCmd
		.command('get <id>')
		.description('Get details of a task')
		.action(async (id) => {
			if (!isTaskId(id)) {
				logger.err(TaskManagerErr.InvalidId(id).message);
				return;
			}

			try {
				await getTask({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				}, id);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	taskCmd
		.command('add <addrOrIdx> <file>')
		.description('Add a task')
		.action(async (addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			const taskOrErr = loadDataFromFile(file);
			if (taskOrErr instanceof Error) {
				logger.err(taskOrErr.message);
				return;
			}

			// TODO:
			// May add logic to check the validity of loaded task

			try {
				await addTask({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				}, walletOrErr, taskOrErr);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});
	taskCmd
		.command('join <addrOrIdx> <id> <pk>')
		.description('Join a task')
		.action(async (addrOrIdx, id, pk) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			if (!isTaskId(id)) {
				logger.err(TaskManagerErr.InvalidId(id).message);
				return;
			}

			if (!isNodePk(pk)) {
				logger.err(TaskManagerErr.InvalidPk(pk).message);
				return;
			}

			try {
				await joinTask({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				}, walletOrErr, id, pk);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});
	taskCmd
		.command('balance <addrOrIdx>')
		.description('Get withdraw balance')
		.action(async (addrOrIdx) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			try {
				const balanceOrErr = await new TaskManager({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				}).balance(walletOrErr.address);

				if (balanceOrErr instanceof Error) {
					logger.err(balanceOrErr.message);
					return;
				}
				logger.log(`Withdraw balance\nAddress: ${walletOrErr.address}\nBalance: ${Number(balanceOrErr)}`);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});
	taskCmd
		.command('withdraw <addrOrIdx>')
		.description('Withdraw balance')
		.action(async (addrOrIdx) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			try {
				const errOrNull = await new TaskManager({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				}).withdraw(walletOrErr);

				if (errOrNull instanceof Error) {
					logger.err(errOrNull.message);
				}
				logger.log(`Balance withdrawn\nAddress: ${walletOrErr.address}`);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});
	taskCmd
		.command('reward <addrOrIdx> <file>')
		.description('Distribute reward')
		.action(async (addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			const reqOrErr = loadDataFromFile(file);
			if (reqOrErr instanceof Error) {
				logger.err(reqOrErr.message);
				return;
			}
			const req = reqOrErr as RewardReq;

			if (!isTaskId(req.id)) {
				logger.err(TaskManagerErr.InvalidId(req.id).message);
				return;
			}
			if (req.pks.length === 0) {
				logger.err(TaskManagerErr.EmptyNodeList().message);
				return;
			}
			for (const pk of req.pks) {
				if (!isNodePk(pk)) {
					logger.err(TaskManagerErr.InvalidPk(pk).message);
					return;
				}
			};

			try {
				await rewardTask({ 
					provider, 
					addr: cfg.deployed.TaskMgr, 
					abi: abi.TaskMgr 
				}, walletOrErr, req.id, req.pks);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	return taskCmd;
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
		throw ids;
	}
	const tasks: Record<string, Task> = {};
	const nodeLists: Record<string, string[]> = {};

	for (const id of ids) {
		const tasksOrErr = await taskManager.getTask(id);
		if (tasksOrErr instanceof Error) {
			throw tasksOrErr;
		}
		tasks[tasksOrErr.id] = tasksOrErr;
		const listOrErr = await taskManager.getNodeList(id);
		if (listOrErr instanceof Error) {
			throw listOrErr;
		}
		if (listOrErr) {
			nodeLists[id] = listOrErr;
		}
	}

	const errOrNull = saveTaskInfo({ tasks, nodeLists });
	if (errOrNull instanceof Error) {
		throw errOrNull;
	}

	logger.log('Updated local task data');
}

async function addTask(param: Params, wallet: Wallet, task: Task) {
	const taskManager = new TaskManager(param);
	const errOrNull = await taskManager.addTask(wallet, task);
	if (errOrNull instanceof Error) {
		throw errOrNull;
	}
	logger.log('Task added');

	const taskOrErr = await taskManager.getTask(task.id);
	if (taskOrErr instanceof Error) {
		logger.log(taskOrErr.message);
	}
	logger.log(printTask(task));
}

async function joinTask(param: Params, wallet: Wallet, id: string, pk: string) {
	const taskManager = new TaskManager(param);
	const errOrNull = await taskManager.joinTask(wallet, id, pk);
	if (errOrNull instanceof Error) {
		throw errOrNull;
	}

	logger.log(`Joined task\nid=${id}\npk=${pk}`);
}

async function rewardTask(param: Params, wallet: Wallet, id: string, pks: string[]) {
	const taskManager = new TaskManager(param);
	const errOrNull = await taskManager.reward(wallet, id, pks);
	if (errOrNull instanceof Error) {
		throw errOrNull;
	}
	logger.log(`Reward distributed\nid=${id}\npks=${JSON.stringify(pks)}`);
}

async function getTask(params: Params, id: string) {
	const taskManager = new TaskManager(params);
	if (await taskManager.taskExists(id)) {
		const taskOrErr = await taskManager.getTask(id);
		if (taskOrErr instanceof Error) {
			throw taskOrErr;
		}

		const listOrErr = await taskManager.getNodeList(id);
		if (listOrErr instanceof Error) {
			throw listOrErr.message;
		}

		logger.log(printTask(taskOrErr));
		logger.log('Node list: ' + JSON.stringify(listOrErr, null, 2));
	} else {
		throw TaskManagerErr.TaskNotFound(id);
	}
}

async function listTasks(params: Params) {
	const dataOrErr = loadTaskData();
	if (dataOrErr instanceof Error) {
		throw dataOrErr;
	}

	const output = printTaskList(dataOrErr.tasks, dataOrErr.nodeLists);
	if (output.length === 0) {
		throw TaskManagerErr.EmptyTaskList();
	} else {
		logger.log(output);
	}
}