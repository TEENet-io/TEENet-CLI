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

	public async taskExists(id: string): Promise<boolean | Error> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, this._provider);
			return contract.taskExists(id);
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getTaskIds(): Promise<string[] | Error> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, this._provider);
			return await contract.getTaskIds();
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getTasks(): Promise<Task[] | Error> {
		try {
			const taskIds = await this.getTaskIds();
			if (taskIds instanceof Error) {
				return taskIds;
			}

			const tasks: Task[] = [];
			for (const taskId of taskIds) {
				const contract = new ethers.Contract(this._addr, this._abi, this._provider);
				const values = await contract.getTask(taskId);
				tasks.push(this._marshalTask(values));
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

	public async addTask(signer: ethers.Signer, task: Task): Promise<Error | null> {
		try {
			// check balance
			const deposit = BigInt(task.rewardPerNode) * BigInt(task.maxNodeNum);
			const balance = await this._provider.getBalance(await signer.getAddress());
			if (balance < deposit) {
				return new Error("Insufficient balance");
			}

			const contract = new ethers.Contract(this._addr, this._abi, signer);
			await contract.add(task, { value: deposit});
			return null;
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
}