// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableMap} from"@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import {Task, Node} from "./types.sol";
import {NodeInfo} from "./NodeInfo.sol";

contract TaskMgr is Ownable {
	using EnumerableMap for EnumerableMap.Bytes32ToUintMap;

    address nodeInfoContract;
    mapping(bytes32 => Task) tasks; 				// task id => task
	// task id => (node pk => 1: not yet rewarded, 2: rewarded)
    mapping(bytes32 => EnumerableMap.Bytes32ToUintMap) nodeList;	
    mapping(address => uint256) public balance;		// reward_receiving_addr or task_owner_addr => balance
    mapping(bytes32 => uint256) public deposit;		// task id => deposit not yet distributed

	event Add(bytes32 indexed id, Task task);
	event Join(bytes32 indexed id, bytes32 indexed pk);
	event Reward(bytes32 indexed id, bytes32[] pks);
	event WithdrawDeposit(bytes32 indexed id, uint256 amount);

    constructor(
        address initOwner,
        address _nodeInfoContract
    ) Ownable(initOwner) {
        nodeInfoContract = _nodeInfoContract;
    }

	/**
	 * @dev Rules for adding a task
	 * 1. Task id must not be zero
	 * 2. Task must not exist
	 * 3. Task must not be full
	 * 4. Deposit must be equal or larger than (rewardPerNode * maxNodeNum)
	 * 5. If owner is left blank (i.e., zero address), msg.sender will be assigned
	 * 6. Starting time will be set to block.timestamp
	 * 
	 * @param task new task
	 */
    function add(Task memory task) payable external {
		require(task.id != 0, "Zero id");
        require(tasks[task.id].id == 0, "Task already exists");
		require(task.maxNodeNum > 0, "Invalid maxNodeNum");
		require(task.numDays > 0, "Invalid duration");
		require(task.rewardPerNode > 0, "Invalid reward per node");
		require(msg.value >= task.rewardPerNode * task.maxNodeNum, "Insufficient deposit");

        task.start = block.timestamp;
		if (task.owner == address(0)) {
        	task.owner = msg.sender;
		}
        tasks[task.id] = task;
		deposit[task.id] = msg.value;

		emit Add(task.id, task);
    }

    function getTask(bytes32 id) external view returns (Task memory) {
		return tasks[id];
    }

    function taskExists(bytes32 id) external view returns (bool) {
		return tasks[id].id != 0;
    }

    function getNodeList(bytes32 id) external view returns (bytes32[] memory) {
		return nodeList[id].keys();
    }

    function withdraw() external {
        uint256 amount = balance[msg.sender];
        require(amount > 0, "Zero balance");

        balance[msg.sender] = 0;
		payable(msg.sender).transfer(amount);
    }

	/**
	 * @dev Rules for joing a task
	 * 1. Task must exist
	 * 2. Task must not be full
	 * 3. Task must not be expired
	 * 4. Node pk must exist in contract NodeInfo
	 * 5. Node owner must be msg.sender
	 * 
	 * @param id task id
	 * @param pk node pk
	 */
    function join(bytes32 id, bytes32 pk) external {
		require(id != 0, "Zero id");
		require(pk != 0, "Zero pk");
		require(tasks[id].id != 0, "Task not found");
		require(nodeList[id].length() < tasks[id].maxNodeNum, "Task full");
		require(tasks[id].start + tasks[id].numDays * 1 days > block.timestamp, "Task expired");

		NodeInfo nodeInfo = NodeInfo(nodeInfoContract);
		require(nodeInfo.nodeExists(pk), "Node not found");

		Node memory node = nodeInfo.getNodeInfo(pk);
		require(node.owner == msg.sender, "Invalid node owner");

		nodeList[id].set(pk, 1);

		emit Join(id, pk);
	}

	/**
	 * @dev Rules for rewarding
	 * 1. Task must exist
	 * 2. Task must be expired
	 * 3. Nodes must be on the list with status 1 
	 * 4. Deposit must be equal or larger than (rewardPerNode * numNodes)
	 * 
	 * @param id task id
	 * @param pks array of pks of nodes to be rewarded
	 */
	function reward(bytes32 id, bytes32[] memory pks) external onlyOwner {
		require(id != 0, "Zero id");
		require(tasks[id].id != 0, "Task not found");
		require(tasks[id].start + tasks[id].numDays * 1 days <= block.timestamp, "Task must be expired");
		require(pks.length > 0, "Empty nodes");
		for (uint256 i = 0; i < pks.length; i++) {
			require(nodeList[id].contains(pks[i]), "Node not found");
			require(nodeList[id].get(pks[i]) == 1, "Node can only be rewarded once");
		}
		require(pks.length * tasks[id].rewardPerNode <= deposit[id], "Insufficient deposit");

		deposit[id] -= pks.length * tasks[id].rewardPerNode;
		NodeInfo nodeInfo = NodeInfo(nodeInfoContract);
		for (uint256 i = 0; i < pks.length; i++) {
			nodeList[id].set(pks[i], 2);
			balance[nodeInfo.getNodeInfo(pks[i]).owner] += tasks[id].rewardPerNode;
		}
		
		emit Reward(id, pks);
	}

	/**
	 * @dev Rules for returning deposit
	 * 1. Task must exist
	 * 2. Task must be expired
	 * 3. Deposit must be larger than zero
	 * 4. Can only be called by contract owner
	 * 
	 * @param id task id
	 */
	function withdrawDeposit(bytes32 id) external onlyOwner {
		require(id != 0, "Zero id");
		require(tasks[id].id != 0, "Task not found");
		require(tasks[id].start + tasks[id].numDays * 1 days <= block.timestamp, "Task must be expired");
		require(deposit[id] > 0, "Zero deposit");

		uint256 amount = deposit[id];
		deposit[id] = 0;
		balance[tasks[id].owner] += amount;

		emit WithdrawDeposit(id, amount);
	}
}
