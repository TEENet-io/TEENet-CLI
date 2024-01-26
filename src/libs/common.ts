import { Provider, isHexString, isError, hexlify, randomBytes } from 'ethers';

export async function isContract(provider: Provider, addr: string): Promise<boolean> {
	const code = await provider.getCode(addr);
	return code !== '0x';
}

export function isNumbericString(str: string): boolean {
	return /^\d+$/.test(str) && !Number.isNaN(str);
}

export function isBytes32(str: string): boolean {
	return isHexString(str) && str.length === 66;
}

export function getRevertError(err: any): Error {
	if(isError(err, 'CALL_EXCEPTION')) {
		return new Error(err.shortMessage);
	}
	return new Error(err);
}

export const randBytes = (numBytes: number) => {
	return hexlify(randomBytes(numBytes));
}