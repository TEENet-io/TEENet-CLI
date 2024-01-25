import { Provider, isHexString } from 'ethers';

export async function isContract(provider: Provider, addr: string): Promise<boolean> {
	const code = await provider.getCode(addr);
	return code !== '0x';
}

export function isNumbericString(str: string): boolean {
	return typeof str === 'string' && !Number.isNaN(str);
}

export function isBytes32(str: string): boolean {
	return isHexString(str) && str.length === 66;
}