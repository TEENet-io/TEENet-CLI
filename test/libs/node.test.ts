import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, network, artifacts } from "hardhat";
import { expect } from "chai";
import { Node } from "../../src/libs/types";
import { NodeManager } from "../../src/libs/node";

describe("NodeManager", function () {
	async function deployFixture() {
		const [backend] = await ethers.getSigners();

		// deploy contracts
		const NodeInfo = await ethers.getContractFactory("NodeInfo");
		const nodeInfo = await NodeInfo.deploy(backend.address);

		const randBytes = (numBytes: number) => {
			return ethers.hexlify(ethers.randomBytes(numBytes));
		}

		const genNode = () => {
			return {
				pk: randBytes(32),
				owner: randBytes(20),
				teeType: randBytes(8),
				teeVer: randBytes(8),
				attestation: randBytes(32)
			}
		};
		const nodes: Node[] = [genNode(), genNode(), genNode()];

		const provider = new ethers.BrowserProvider(network.provider);
		const nodeManager = new NodeManager({
			provider: provider,
			addr: await nodeInfo.getAddress(),
			abi: (await artifacts.readArtifact("NodeInfo")).abi
		});
		return { nodeManager, nodeInfo, backend, nodes, randBytes };
	}
	describe("getNodeInfo", function () {
		it("should return null if node does not exist", async function () {
			const { randBytes, nodeManager } = await loadFixture(deployFixture);
			expect(await nodeManager.getNodeInfo(randBytes(32))).to.be.null;
		});
		it("should return correct node info", async function () {
			const { backend, nodeInfo, nodes, nodeManager } = await loadFixture(deployFixture);

			await nodeInfo.connect(backend).addOrUpdate(nodes[0]);

			expect(await nodeManager.getNodeInfo(nodes[0].pk)).to.deep.equal(nodes[0]);
		});
	});
	describe("remove", function () {
		it("Should return error when node does not exist", async function () {
			const { randBytes, nodeManager, backend } = await loadFixture(deployFixture);
			expect((await nodeManager.remove(backend, randBytes(32)))!.message).to.equal("Node does not exist");
		});
		it("Should return true when node exists", async function () {
			const { nodeManager, backend, nodeInfo, nodes } = await loadFixture(deployFixture);
			await nodeInfo.connect(backend).addOrUpdate(nodes[0]);
			expect(await nodeManager.remove(backend, nodes[0].pk)).to.be.null;
		});
	});
	describe("addOrUpdate", function () {
		it("Should add correct node info", async function () {
			const { nodeManager, backend, nodes } = await loadFixture(deployFixture);
			expect(await nodeManager.addOrUpdate(backend, nodes[0])).to.be.null;
			expect(await nodeManager.getNodeInfo(nodes[0].pk)).to.deep.equal(nodes[0]);
		});
	});
});