import { ethers } from "ethers";
import { Code } from "./types";

export class CodeManager {
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

	public async getCode(hash: string): Promise<Code | null | Error> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, this._provider);
			if(!(await contract.codeExists(hash))) {
				return null;
			}
			return this._marshalCode(await contract.getCode(hash));
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async addOrUpdate(backend: ethers.Signer, code: Code): Promise<Error | null> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, backend);
			await contract.addOrUpdate(code);
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async remove(backend: ethers.Signer, hash: string): Promise<Error | null> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, backend);
			if (!(await contract.codeExists(hash))) {
				return new Error("Code does not exist");
			}
			await contract.remove(hash);
			return null;
		} catch (err: any) {
			return new Error(err);
		}
	}

	private _marshalCode(values: any[]): Code {
		return {
			hash: values[0],
			url: values[1]
		};
	}
}