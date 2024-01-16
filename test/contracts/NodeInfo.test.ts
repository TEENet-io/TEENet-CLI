import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Node } from "./types";

describe("NodeInfo", function () {
	async function deployFixture() {
		const [first, second, third] = await ethers.getSigners();

		const NodeInfo = await ethers.getContractFactory("NodeInfo");
		const nodeInfo = await NodeInfo.deploy(second.address);

		const pk1 = ethers.hexlify(ethers.randomBytes(32));
		const pk2 = ethers.hexlify(ethers.randomBytes(32));

		const teeType = ethers.hexlify(ethers.randomBytes(4));
		const teeVer = ethers.hexlify(ethers.randomBytes(4));
		const attestation = ethers.hexlify(ethers.randomBytes(64));
		const node: Node = {
			pk: pk1,
			owner: third.address,
			teeType: teeType,
			teeVer: teeVer,
			attestation: attestation,
		}

		const emptyNode: Node = {
			pk: ethers.ZeroHash,
			owner: ethers.ZeroAddress,
			teeType: '0x',
			teeVer: '0x',
			attestation: '0x'
		};

		return { nodeInfo, first, second, pk1, pk2, node, emptyNode };
	}

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			const { nodeInfo, second } = await loadFixture(deployFixture);
			expect(await nodeInfo.owner()).to.equal(second.address);
		});
	});

	describe("addOrUpdate", function () {
		it("Should not allow non-owner to operate", async function () {
			const { nodeInfo, first, node } = await loadFixture(deployFixture);

			try {
				await nodeInfo.connect(first).addOrUpdate(node);
			} catch (err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\"" + first.address + "\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should not allow zero pk", async function () {
			const { nodeInfo, second, node } = await loadFixture(deployFixture);

			const n: Node = { ...node };
			n.pk = ethers.ZeroHash;

			try {
				await nodeInfo.connect(second).addOrUpdate(n);
			} catch (err: any) {
				expect(err.message).to.include("Zero pk");
			}
		});
		it("Should not allow zero owner address", async function () {
			const { nodeInfo, second, node } = await loadFixture(deployFixture);

			const n: Node = { ...node };
			n.owner = ethers.ZeroAddress;

			try {
				await nodeInfo.connect(second).addOrUpdate(n);
			} catch (err: any) {
				expect(err.message).to.include("Zero owner");
			}
		});
		it("Should log the correct event and add the correct record", async function () {
			const { nodeInfo, second, pk1, pk2, node, emptyNode } = await loadFixture(deployFixture);
			expect(await nodeInfo.connect(second).addOrUpdate(node)).to.emit(nodeInfo, "AddOrUpdate").withArgs(node);
			expect(await nodeInfo.nodeExists(pk1)).to.equal(true);
			expect(await nodeInfo.nodeExists(pk2)).to.equal(false);
			expect(await nodeInfo.getNodeInfo(pk1)).to.deep.equal(Object.values(node));
			expect(await nodeInfo.getNodeInfo(pk2)).to.deep.equal(Object.values(emptyNode));
		});
		it("Should log the correct event and update the correct record", async function () {
			const { nodeInfo, second, pk1, node } = await loadFixture(deployFixture);
			expect(await nodeInfo.connect(second).addOrUpdate(node)).to.emit(nodeInfo, "AddOrUpdate").withArgs(node);

			const teeType = ethers.hexlify(ethers.randomBytes(4));
			const teeVer = ethers.hexlify(ethers.randomBytes(4));
			const attestation = ethers.hexlify(ethers.randomBytes(64));
			const owner = ethers.hexlify(ethers.randomBytes(20));
			const newNode = {
				pk: pk1,
				owner: owner,
				teeType: teeType,
				teeVer: teeVer,
				attestation: attestation,
			}
			expect(await nodeInfo.connect(second).addOrUpdate(newNode)).to.emit(nodeInfo, "AddOrUpdate").withArgs(newNode);
			expect(await nodeInfo.getNodeInfo(pk1)).to.deep.equal(Object.values(newNode));
		});
	});

	describe("remove", function () {
		it("Should not allow non-owner to operate", async function () {
			const { nodeInfo, first, node } = await loadFixture(deployFixture);

			try {
				await nodeInfo.connect(first).addOrUpdate(node);
			} catch (err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\"" + first.address + "\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should remove data correctly", async function () {
			const { nodeInfo, second, pk1, node, emptyNode } = await loadFixture(deployFixture);
			expect(await nodeInfo.connect(second).addOrUpdate(node)).to.emit(nodeInfo, "AddOrUpdate").withArgs(node);
			expect(await nodeInfo.connect(second).remove(pk1)).to.emit(nodeInfo, "Remove").withArgs(pk1);
			expect(await nodeInfo.nodeExists(pk1)).to.equal(false);
			expect(await nodeInfo.getNodeInfo(pk1)).to.deep.equal(Object.values(emptyNode));
		});
	});
});