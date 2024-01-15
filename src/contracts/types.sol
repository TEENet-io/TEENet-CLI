// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Node {
	bytes32 pk;
	bytes teeType;
	bytes teeVer;
	bytes attestation;
}

struct Task {
	uint256 id;
	uint256 rewardPerNode;

	uint256 start;
	uint256 duration; 		// in days

	address owner;

	uint256 maxNodeNum;
}