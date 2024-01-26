// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Node} from "./types.sol";

contract NodeInfo is Ownable {
    mapping(bytes32 => Node) nodes;

    event Add(bytes32 indexed pk, Node node);
    event Remove(bytes32 indexed pk);

    constructor(address initOwner) Ownable(initOwner) {}

    function add(Node memory node) external onlyOwner {
        require(node.pk != 0, "Zero public key");
        require(node.owner != address(0), "Zero owner");
		require(nodes[node.pk].pk == 0, "Duplicate public key");

        nodes[node.pk] = node;
        emit Add(node.pk, node);
    }

    function remove(bytes32 pk) external onlyOwner returns (bool) {
        if (nodes[pk].pk == 0) {
            return false;
        }

        delete nodes[pk];
        emit Remove(pk);

        return true;
    }

    function nodeExists(bytes32 pk) external view returns (bool) {
        return nodes[pk].pk != 0;
    }

    function getNodeInfo(bytes32 pk) external view returns (Node memory) {
        return nodes[pk];
    }
}
