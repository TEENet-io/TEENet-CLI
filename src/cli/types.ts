export interface Config {
	ver: string;
	url: string;
	deployed: {
		TaskMgr: string;
		NodeInfo: string;
		CodeInfo: string;
	};
}

export const files = {
	config: './config.teenet.json',
	task: './task.teenet.json',
	node: './node.teenet.json',
	code: './code.teenet.json',
	abi: './abi.teenet.json',
	pk: './pk.teenet.json'
}

export type ABIs = {
	TaskMgr: any[];
	NodeInfo: any[];
	CodeInfo: any[];
}