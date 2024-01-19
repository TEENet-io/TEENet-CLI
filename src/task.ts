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

	public async getTaskIds(): Promise<string[]> {	
		const contract = new ethers.Contract(this._addr, this._abi, this._provider);
		const taskIds: string[] = await contract.getTaskIds();
		return taskIds;
	}

	public async getActiveTasks(): Promise<Task[]> {
		const taskIds = await this.getTaskIds();
		const tasks: Task[] = [];

		// Get the latest block timestamp
		const block = await this._provider.getBlock("latest");
		if(block == null) {
			throw new Error("Failed to get latest block");
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
	}

	public async joinTask(signer: ethers.Signer, taskId: string, teePk: string): Promise<boolean> {
		const contract = new ethers.Contract(this._addr, this._abi, signer);
		
		try {
			await contract.join(taskId, teePk);
		} catch(err: any) {	
			throw new Error(err.message || err);
		}
		
		return true;
	}

	public async getNodeList(taskId: string): Promise<string[]> {
		const contract = new ethers.Contract(this._addr, this._abi, this._provider);
		const nodeList: string[] = await contract.getNodeList(taskId);
		return nodeList;
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
		return  expiredAt < now;
	}
}