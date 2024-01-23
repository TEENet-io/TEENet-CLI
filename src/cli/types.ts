export interface Config {
	ver: string;
	url: string;
	contractAddress: {
		task: string;
		node: string;
		code: string;
	}
}

export const files = {
	config: './config.teenet.json',
	task: './task.teenet.json',
	node: './node.teenet.json',
	code: './code.teenet.json',
	abi: './abi.teenet.json'
}