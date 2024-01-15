// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CodeInfo is Ownable {
    mapping(bytes32 => string) info;

	event AddOrUpdate(bytes32 indexed hash, string url);
	event Remove(bytes32 indexed hash);

    constructor(address initOwner) Ownable(initOwner) {}

    function addOrUpdate(bytes32 hash, string memory url) external onlyOwner {
		info[hash] = url;
		emit AddOrUpdate(hash, url);
	}

    function remove(bytes32 hash) external onlyOwner returns (bool){
		if (bytes(info[hash]).length == 0) {
			return false;
		}
		
		delete info[hash];
		emit Remove(hash);

		return true;
	}

	function codeExists(bytes32 hash) external view returns (bool) {
		return bytes(info[hash]).length != 0;
	}

    function getUrl(bytes32 hash) external view returns (string memory) {
        return info[hash];
    }
}
