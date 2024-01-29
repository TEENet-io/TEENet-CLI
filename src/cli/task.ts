import { Command } from 'commander';
import { join } from 'path';
import { Provider, Wallet } from 'ethers';
import { TaskManager } from '../libs/task';
import { Task, Params } from '../libs/types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { LoggerFactory } from './Logger';
import { getWallet, printTask, expireAt, isTaskId, isNodePk, Config, ABIs, files } from './common';
const JSONbig = require('json-bigint');

const logger = LoggerFactory.getInstance();
export function abort(msg: string) {
	logger.log('Aborted: ' + msg);
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
			update({ provider, addr: cfg.deployed.TaskMgr, abi: abi.TaskMgr }).then((errOrNull) => {
				if (errOrNull instanceof Error) {
					abort(errOrNull.message || 'Unknown error');
				}
				logger.log('Updated local task info');
			});
		});

	taskCmd
		.command('list')
		.description('List task info including id, reward, expiring data and node participation info')
		.action(() => {
			const dataOrErr = loadTaskData();
			if (dataOrErr instanceof Error) {
				abort(dataOrErr.message);
				return;
			}
			let count = 0;
			for (const id in dataOrErr.tasks) {
				const task = dataOrErr.tasks[id];
				const list = dataOrErr.nodeLists[id];
				const msg = `[${count}]: ${id}, ${task.rewardPerNode}, ${expireAt(task)}, ${list.length} out of ${task.maxNodeNum}`;
				logger.log(msg);
				count++;
			}
		});

	taskCmd
		.command('get <id>')
		.description('Get details of a task')
		.action((id) => {
			const dataOrErr = loadTaskData();
			if (dataOrErr instanceof Error) {
				abort(dataOrErr.message);
				return;
			}

			if (!isTaskId(id)) {
				abort(`Invalid task id\nid=${id}`);
			}

			const tasks = dataOrErr.tasks;
			const nodeLists = dataOrErr.nodeLists;
			if (!(id in tasks)) {
				abort(`Task not found locally. Run "teenet task update" to update\nid=${id}`);
			} else {
				logger.log(printTask(dataOrErr.tasks[id]));
				logger.log('Node list: ' + JSON.stringify(nodeLists[id], null, 2));
			}
		});

	taskCmd
		.command('add <addrOrIdx> <file>')
		.description('Add a task')
		.action((addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;
			const taskOrErr = loadDataFromFile(file);
			if(taskOrErr instanceof Error) {
				abort(taskOrErr.message);
				return;
			}
			const task = taskOrErr as Task;

			new TaskManager({
				provider,
				addr: cfg.deployed.TaskMgr,
				abi: abi.TaskMgr
			}).addTask(wallet, task).then((errOrNull) => {
				if (errOrNull instanceof Error) {
					abort(errOrNull.message || 'Unknown error');
				}

				let dataOrErr: Data | Error = { tasks: {}, nodeLists: {} };
				if (existsSync(join(__dirname, 'data', files.task))) {
					dataOrErr = loadTaskData();
					if (dataOrErr instanceof Error) {
						abort('Failed to update local task info. Run "teenet task update" to update\n' + dataOrErr.message);
						return;
					}
				}

				// Get task info from blockchain to get values for task.start and task.owner (if not set in file)
				new TaskManager({
					provider,
					addr: cfg.deployed.TaskMgr,
					abi: abi.TaskMgr
				}).getTask(task.id).then((taskOrErr) => {
					if (taskOrErr instanceof Error) {
						abort('Failed to update local task info. Run "teenet task update" to update\n' + taskOrErr.message);
						return;
					}

					logger.log('Added task info');
					logger.log(printTask(task));

					const data = dataOrErr as Data;
					data.tasks[taskOrErr.id] = taskOrErr;
					const errOrNull = saveTaskInfo(data);
					if (errOrNull instanceof Error) {
						abort('Failed to update local task info. Run "teenet task update" to update\n' + errOrNull.message);
					};
				});
			});
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
				abort(`Invalid task id\nid=${id}`);
			}

			if (!isNodePk(pk)) {
				abort(`Invalid tee public key\n${pk}`);
			}

			if (!existsSync(join(__dirname, 'data', files.task))) {
				abort('Local task info not found. Run "teenet task update" to update');
			}

			const dataOrErr = loadTaskData();
			if (dataOrErr instanceof Error) {
				abort('Failed to load task info\n' + dataOrErr.message);
				return;
			}

			const tasks = dataOrErr.tasks;
			const nodeLists = dataOrErr.nodeLists;

			if (!(id in tasks)) {
				abort(`Task not found locally\nid=${id}`);
			}

			if (nodeLists[id].length >= tasks[id].maxNodeNum) {
				abort(`Task is full\nid=${id}`);
			}

			new TaskManager({
				provider,
				addr: cfg.deployed.TaskMgr,
				abi: abi.TaskMgr
			}).joinTask(walletOrErr, id, pk).then((e) => {
				if (e instanceof Error) {
					abort(e.message || 'Unknown error');
				}

				logger.log(`Joined task\nid=${id}\npk=${pk}`);

				nodeLists[id].push(pk);
				const errOrNull = saveTaskInfo({ tasks, nodeLists });
				if (errOrNull instanceof Error) {
					abort('Failed to update local task info. Run "teenet task update" to update\n' + errOrNull.message);
				};
			});
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
					abort(balanceOrErr.message || 'Unknown error');
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
					abort(errOrNull.message || 'Unknown error');
					return;
				}
				logger.log(`Withdraw done\nAddress: ${walletOrErr.address}`);
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
			if(reqOrErr instanceof Error) {
				abort(reqOrErr.message);
				return;
			}
			const req = reqOrErr as RewardReq;

			if (!isTaskId(req.id)) {
				abort(`Invalid task id\nid=${req.id}`);
			}
			if (req.pks.length === 0) {
				abort(`No TEE nodes to reward`);
			}

			const dataOrErr = loadTaskData();
			if (dataOrErr instanceof Error) {
				abort('Failed to load task info\n' + dataOrErr.message);
				return;
			}
			if(!(req.id in dataOrErr.tasks)) {
				abort(`Task not found locally\nid=${req.id}`);
			}
			req.pks.forEach((pk) => {
				if (!isNodePk(pk)) {
					abort(`Invalid tee public key\npk=${pk}`);
				}
				if(!dataOrErr.nodeLists[req.id].includes(pk)) {
					abort(`Public key not found in node list\npk=${pk}`);
				}
			});

			new TaskManager({
				provider,
				addr: cfg.deployed.TaskMgr,
				abi: abi.TaskMgr
			}).reward(walletOrErr, req.id, req.pks).then((errOrNull) => {
				if (errOrNull instanceof Error) {
					abort(errOrNull.message || 'Unknown error');
					return;
				}
				logger.log(`Reward distributed\nid=${req.id}\npks=${JSON.stringify(req.pks)}`);
			});
		});
}

function loadDataFromFile(file: string) {
	const _file = join(__dirname, 'data', file);

	let data: any;
	try {
		data = JSON.parse(readFileSync(file, 'utf-8'));
	} catch (err: any) {
		return new Error(`Failed to load task data\nfile=${err.message}`);
	}
	return data;
}

function loadTaskData(): Data | Error {
	const file = join(__dirname, 'data', files.task);

	let data: Data;
	try {
		data = JSON.parse(readFileSync(file, 'utf-8'));
	} catch (err: any) {
		return new Error('Failed to load task data\n' + err.message);
	}
	return data;
}

function saveTaskInfo(data: Data): Error | null {
	const file = join(__dirname, 'data', files.task);
	try {
		writeFileSync(file, JSONbig.stringify(data, null, 2));
	} catch (err: any) {
		return new Error('Failed to save task data\n' + err.message);
	}
	return null;
}

async function update(param: Params): Promise<Error | null> {
	const taskManager = new TaskManager(param);
	const ids = await taskManager.getTaskIds();
	if (ids instanceof Error) {
		throw new Error(ids.message);
	}
	const tasks: Record<string, Task> = {};
	const nodeLists: Record<string, string[]> = {};

	for (const id of ids) {
		const tasksOrErr = await taskManager.getTask(id);
		if (tasksOrErr instanceof Error) {
			throw new Error(tasksOrErr.message);
		}
		tasks[tasksOrErr.id] = tasksOrErr;
		const listOrErr = await taskManager.getNodeList(id);
		if (listOrErr instanceof Error) {
			throw new Error(listOrErr.message);
		}
		if (listOrErr) {
			nodeLists[id] = listOrErr;
		}
	}

	return saveTaskInfo({ tasks, nodeLists });
}