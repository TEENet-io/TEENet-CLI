import { ethers } from "ethers";
import { Node } from "./types";

export class NodeManager {
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

	public async getNodeInfo(id: string): Promise<Node | null | Error> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, this._provider);
			const values: any[] = await contract.getNodeInfo(id);
			const node = this._marshalNode(values);
			return BigInt(node.pk) == 0n ? null : node;
		} catch (err: any) {
			return new Error(err);
		}
	}

	public async addOrUpdate(backend: ethers.Signer, node: Node): Promise<Error | null> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, backend);
			await contract.addOrUpdate(node);
		} catch (err: any) {
			return new Error(err);
		}

		return null;
	}

	public async remove(backend: ethers.Signer, id: string): Promise<Error | null> {
		try {
			const contract = new ethers.Contract(this._addr, this._abi, backend);
			if (!(await contract.nodeExists(id))) {
				return new Error("Node does not exist");
			}
			await contract.remove(id);
		} catch (err: any) {
			return new Error(err);
		}

		return null;
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