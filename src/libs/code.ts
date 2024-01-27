import { Provider, Signer, Contract } from "ethers";
import { Code, Params } from "./types";
import { getRevertError } from "./common";

export class CodeManager {
	private readonly _provider: Provider;
	private readonly _addr: string;
	private readonly _abi: any[];

	constructor(params: Params) {
		this._provider = params.provider;
		this._addr = params.addr;
		this._abi = params.abi;
	}

	public async codeExists(hash: string): Promise<boolean | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			return contract.codeExists(hash);
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	public async getCode(hash: string): Promise<Code | null | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			if (!(await contract.codeExists(hash))) {
				return null;
			}
			return this._marshalCode(await contract.getCode(hash));
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	public async addOrUpdate(backend: Signer, code: Code): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, backend);
			const tx = await contract.addOrUpdate(code);
			await tx.wait();
			return null;
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	public async remove(backend: Signer, hash: string): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, backend);
			const tx = await contract.remove(hash);
			await tx.wait();
			return null;
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	private _marshalCode(values: any[]): Code {
		return {
			hash: values[0],
			url: values[1]
		};
	}
}