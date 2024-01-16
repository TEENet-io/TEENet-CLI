import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Task } from "./types";

describe("TaskMgr", function () {
	async function deployFixture() {
		const [first, second] = await ethers.getSigners();

		const NodeInfo = await ethers.getContractFactory("NodeInfo");
		const nodeInfo = await NodeInfo.deploy(second.address);

		const TaskMgr = await ethers.getContractFactory("TaskMgr");
		const taskMgr = await TaskMgr.deploy(second.address, await nodeInfo.getAddress());

		const id1 = ethers.hexlify(ethers.randomBytes(32));
		const id2 = ethers.hexlify(ethers.randomBytes(32));
		const task: Task = {
			id: id1,
			rewardPerNode: 100,
			start: 0,
			numDays: 3,
			maxNodeNum: 1,
			owner: ethers.ZeroAddress
		}

		const emptyTask: Task = {
			id: ethers.ZeroHash,
			rewardPerNode: 0,
			start: 0,
			numDays: 0,
			maxNodeNum: 0,
			owner: ethers.ZeroAddress
		}

		// const pk1 = ethers.hexlify(ethers.randomBytes(32));
		// const pk2 = ethers.hexlify(ethers.randomBytes(32));

		// const teeType = ethers.hexlify(ethers.randomBytes(4));
		// const teeVer = ethers.hexlify(ethers.randomBytes(4));
		// const attestation = ethers.hexlify(ethers.randomBytes(64));
		// const node = {
		// 	pk: pk1,
		// 	teeType: teeType,
		// 	teeVer: teeVer,
		// 	attestation: attestation,
		// }
		// const emptyNodeInfo = [ethers.ZeroHash, '0x', '0x', '0x']

		return { taskMgr, first, second, id1, id2, task, emptyTask };
	}

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			const { taskMgr, second } = await loadFixture(deployFixture);
			expect(await taskMgr.owner()).to.equal(second.address);
		});
	});

	describe("add", function () {
		it("Should not allow insufficient deposit", async function () {
			const { taskMgr, task } = await loadFixture(deployFixture);

			try {
				const deposit = task.rewardPerNode * task.maxNodeNum - 1;
				await taskMgr.add(task, {value: deposit});
			} catch (err: any) {
				expect(err.message).to.include("Insufficient deposit");
			}
		});
		it("Should not allow zero task id", async function () {
			const { taskMgr, emptyTask } = await loadFixture(deployFixture);

			try {
				await taskMgr.add(emptyTask);
			} catch (err: any) {
				expect(err.message).to.include("Invalid id");
			}
		});
		it("Should set the message sender as owner given zero input owner address", async function () {
			const { taskMgr, first, id1, task } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum;
			await taskMgr.add(task, {value: deposit});

			expect(await taskMgr.taskExists(id1)).to.equal(true);
			expect((await taskMgr.getTask(id1)).owner).to.deep.equal(first.address);
		});
		it("Should log the correct event and add the correct record", async function () {
			const { taskMgr, second, id1, id2, task, emptyTask } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum + 1; 
			const ret = await taskMgr.connect(second).add(task, {value: deposit});

			task.owner = second.address;
			task.start = (await ethers.provider.getBlock('latest'))!.timestamp;
			expect(ret).to.emit(taskMgr, "Add").withArgs(task.id, task);

			expect(await taskMgr.taskExists(id1)).to.equal(true);
			expect(await taskMgr.taskExists(id2)).to.equal(false);

			expect(await taskMgr.getTask(id1)).to.deep.equal(Object.values(task));
			expect(await taskMgr.getTask(id2)).to.deep.equal(Object.values(emptyTask));
		});
		it("Should set the correct deposit value", async function () {
			const { taskMgr, id1, task } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum + 10; 
			await taskMgr.add(task, {value: deposit});

			expect(await taskMgr.deposit(id1)).to.equal(deposit);
		});
	});

});