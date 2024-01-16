// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Code} from "./types.sol";

contract CodeInfo is Ownable {
    mapping(bytes32 => Code) codes;

	event AddOrUpdate(bytes32 indexed hash, Code code);
	event Remove(bytes32 indexed hash);

    constructor(address initOwner) Ownable(initOwner) {}

    function addOrUpdate(Code memory code) external onlyOwner {
		require(code.hash != 0, "Invalid hash");

		codes[code.hash] = code;
		emit AddOrUpdate(code.hash, code);
	}

    function remove(bytes32 hash) external onlyOwner returns (bool){
		if (codes[hash].hash == 0) {
			return false;
		}
		
		delete codes[hash];
		emit Remove(hash);

		return true;
	}

	function codeExists(bytes32 hash) external view returns (bool) {
		return codes[hash].hash != 0;
	}

	function getCode(bytes32 hash) external view returns (Code memory) {
		return codes[hash];
	}
}
