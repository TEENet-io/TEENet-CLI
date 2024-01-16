// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Code {
	bytes32 hash;
	string url;
}

struct Node {
	bytes32 pk;
	address owner;
	bytes teeType;
	bytes teeVer;
	bytes attestation;
}

struct Task {
	bytes32 id;
	address owner;
	uint256 rewardPerNode;
	uint256 start;
	uint256 numDays; 		// in days
	uint256 maxNodeNum;
}