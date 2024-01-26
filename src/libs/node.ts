import { Provider, Signer, Contract } from "ethers";
import { Node, Params } from "./types";
import { getRevertError } from "./common";

export class NodeManager {
	private readonly _provider: Provider;
	private readonly _addr: string;
	private readonly _abi: any[];

	constructor(params: Params) {
		this._provider = params.provider;
		this._addr = params.addr;
		this._abi = params.abi;
	}

	public async nodeExists(pk: string): Promise<boolean | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			return contract.nodeExists(pk);
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	public async getNodeInfo(pk: string): Promise<Node | null | Error> {
		try {
			const contract = new Contract(this._addr, this._abi, this._provider);
			if(!(await contract.nodeExists(pk))) {
				return null;
			}
			return this._marshalNode(await contract.getNodeInfo(pk));
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	public async addOrUpdate(backend: Signer, node: Node): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, backend);
			const tx = await contract.addOrUpdate(node);
			await tx.wait();
			return null;
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	public async remove(backend: Signer, pk: string): Promise<Error | null> {
		try {
			const contract = new Contract(this._addr, this._abi, backend);
			if (!(await contract.nodeExists(pk))) {
				return new Error("Node does not exist");
			}
			const tx = await contract.remove(pk);
			await tx.wait();
			return null;
		} catch (err: any) {
			return getRevertError(err);
		}
	}

	private _marshalNode(values: any[]): Node {
		return {
			pk: values[0],
			owner: values[1],
			teeType: values[2],
			teeVer: values[3],
			attestation: values[4]
		};
	}
}