import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("NodeInfo", function () {
	async function deployFixture() {
		const [first, second] = await ethers.getSigners();

		const NodeInfo = await ethers.getContractFactory("NodeInfo");
		const nodeInfo = await NodeInfo.deploy(second.address);

		const pk1 = ethers.hexlify(ethers.randomBytes(32));
		const pk2 = ethers.hexlify(ethers.randomBytes(32));

		const teeType = ethers.hexlify(ethers.randomBytes(4));
		const teeVer = ethers.hexlify(ethers.randomBytes(4));
		const attestation = ethers.hexlify(ethers.randomBytes(64));
		const node = {
			pk: pk1,
			teeType: teeType,
			teeVer: teeVer,
			attestation: attestation,
		}

		const emptyNodeInfo = [ethers.ZeroHash, '0x', '0x', '0x']

		return { nodeInfo, first, second, pk1, pk2, node, emptyNodeInfo };
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
		it("Should log the correct event and add the correct record", async function () {
			const { nodeInfo, second, pk1, pk2, node, emptyNodeInfo } = await loadFixture(deployFixture);
			expect(await nodeInfo.connect(second).addOrUpdate(node)).to.emit(nodeInfo, "AddOrUpdate").withArgs(node);
			expect(await nodeInfo.nodeExists(pk1)).to.equal(true);
			expect(await nodeInfo.nodeExists(pk2)).to.equal(false);
			expect(await nodeInfo.getNodeInfo(pk1)).to.deep.equal([node.pk, node.teeType, node.teeVer, node.attestation]);
			expect(await nodeInfo.getNodeInfo(pk2)).to.deep.equal(emptyNodeInfo);
		});
		it("Should log the correct event and update the correct record", async function () {
			const { nodeInfo, second, pk1, node } = await loadFixture(deployFixture);
			expect(await nodeInfo.connect(second).addOrUpdate(node)).to.emit(nodeInfo, "AddOrUpdate").withArgs(node);

			const teeType = ethers.hexlify(ethers.randomBytes(4));
			const teeVer = ethers.hexlify(ethers.randomBytes(4));
			const attestation = ethers.hexlify(ethers.randomBytes(64));
			const newNode = {
				pk: pk1,
				teeType: teeType,
				teeVer: teeVer,
				attestation: attestation,
			}
			expect(await nodeInfo.connect(second).addOrUpdate(newNode)).to.emit(nodeInfo, "AddOrUpdate").withArgs(newNode);
			expect(await nodeInfo.getNodeInfo(pk1)).to.deep.equal([newNode.pk, newNode.teeType, newNode.teeVer, newNode.attestation]);
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
			const { nodeInfo, second, pk1, node, emptyNodeInfo } = await loadFixture(deployFixture);
			expect(await nodeInfo.connect(second).addOrUpdate(node)).to.emit(nodeInfo, "AddOrUpdate").withArgs(node);
			expect(await nodeInfo.connect(second).remove(pk1)).to.emit(nodeInfo, "Remove").withArgs(pk1);
			expect(await nodeInfo.nodeExists(pk1)).to.equal(false);
			expect(await nodeInfo.getNodeInfo(pk1)).to.deep.equal(emptyNodeInfo);
		});
	});
});