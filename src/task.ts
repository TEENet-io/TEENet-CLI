import { ethers } from "ethers";
import { Task } from "./types";

export class TaskManager {
	private readonly _provider: ethers.Provider;
	private readonly _addr: string;
	private readonly _abi: any[];

	constructor(opt: {
		provider: ethers.Provider
		addr: string,
		abi: any[]
	}) {
		this._provider = opt.provider;
		this._addr = opt.addr;
		this._abi = opt.abi;
	}

	public async getTaskIds(): Promise<string[] | Error> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, this._provider);
			return await contract.getTaskIds();
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getActiveTasks(): Promise<Task[] | Error> {
		try {
			const taskIds = await this.getTaskIds();

			if (taskIds instanceof Error) {
				return taskIds;
			}

			const tasks: Task[] = [];

			// Get the latest block timestamp
			const block = await this._provider.getBlock("latest");
			if (block == null) {
				return new Error("Failed to get latest block");
			}
			const now = block.timestamp;

			for (const taskId of taskIds) {
				const contract = new ethers.Contract(this._addr, this._abi, this._provider);
				const values = await contract.getTask(taskId);
				const task = this._marshalTask(values);

				const isExpired = this._isTaskExpired(task, now);
				if (!isExpired) {
					tasks.push(task);
				}
			}
			return tasks;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async joinTask(signer: ethers.Signer, taskId: string, teePk: string): Promise<Error | null> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, signer);
			await contract.join(taskId, teePk);
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getNodeList(taskId: string): Promise<string[] | null | Error> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, this._provider);
			if (!await contract.taskExists(taskId)) {
				return null;
			}

			const nodeList: string[] = await contract.getNodeList(taskId);
			return nodeList;
		} catch (err: any) {
			return new Error(err);
		}
	}

	private _marshalTask(values: any[]): Task {
		const task: Task = {} as Task;
		task.id = values[0];
		task.owner = values[1];
		task.rewardPerNode = Number(values[2]);
		task.start = Number(values[3]);
		task.numDays = Number(values[4]);
		task.maxNodeNum = Number(values[5]);
		task.codeHash = values[6];
		return task;
	}

	private _isTaskExpired(task: Task, now: number): boolean {
		const expiredAt = task.start + task.numDays * 24 * 3600;
		return expiredAt < now;
	}
}