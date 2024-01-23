import { Provider, Signer, Contract } from "ethers";
import { Task, Params } from "./types";

export class TaskManager {
	private readonly _provider: Provider;
	private readonly _addr: string;
	private readonly _abi: any[];

	constructor(params: Params) {
		this._provider = params.provider;
		this._addr = params.addr;
		this._abi = params.abi;
	}

	public async taskExists(id: string): Promise<boolean | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			return contract.taskExists(id);
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getTaskIds(): Promise<string[] | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			return await contract.getTaskIds();
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getTask(id: string): Promise<Task | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			const values = await contract.getTask(id);
			return this._marshalTask(values);
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async joinTask(signer: Signer, id: string, teePk: string): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, signer);
			await contract.join(id, teePk);
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async getNodeList(id: string): Promise<string[] | null | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			if (!await contract.taskExists(id)) {
				return null;
			}

			return await contract.getNodeList(id);
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async addTask(signer: Signer, task: Task): Promise<Error | null> {
		try {
			// check balance
			const deposit = BigInt(task.rewardPerNode) * BigInt(task.maxNodeNum);
			const balance = await this._provider.getBalance(await signer.getAddress());
			if (balance < deposit) {
				return new Error("Insufficient balance");
			}

			const contract = new Contract(this._addr, this._abi, signer);
			await contract.add(task, { value: deposit});
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async reward(signer: Signer, id: string, pks: string[]): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, signer);
			await contract.reward(id, pks);
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async balance(addr: string): Promise<bigint | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			return await contract.balance(addr);
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async withdraw(signer: Signer): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, signer);
			await contract.withdraw();
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	private _marshalTask(values: any[]): Task {
		const task: Task = {} as Task;
		task.id = String(values[0]);
		task.owner = String(values[1]);
		task.rewardPerNode = BigInt(values[2]);
		task.start = BigInt(values[3]);
		task.numDays = BigInt(values[4]);
		task.maxNodeNum = BigInt(values[5]);
		task.codeHash = String(values[6]);

		return task;
	}
}