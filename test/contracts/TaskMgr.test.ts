import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Task, Node, Code } from "../../src/libs/types";
import { randBytes } from "../../src/libs/common";

describe("TaskMgr", function () {
	async function deployFixture() {
		const [first, second, ...otherAccounts] = await ethers.getSigners();

		const NodeInfo = await ethers.getContractFactory("NodeInfo");
		const nodeInfo = await NodeInfo.deploy(second.address);

		const CodeInfo = await ethers.getContractFactory("CodeInfo");
		const codeInfo = await CodeInfo.deploy(second.address);

		const TaskMgr = await ethers.getContractFactory("TaskMgr");
		const taskMgr = await TaskMgr.deploy(second.address, await nodeInfo.getAddress(), await codeInfo.getAddress());

		const id1 = randBytes(32);
		const id2 = randBytes(32);
		const codeHash = randBytes(32);

		const code: Code = {
			hash: codeHash,
			url: "https://url.com"
		}
		await codeInfo.connect(second).addOrUpdate(code);

		const task: Task = {
			id: id1,
			owner: ethers.ZeroAddress,
			rewardPerNode: 100n,
			start: 0n,
			numDays: 1n,
			maxNodeNum: 2n,
			codeHash: codeHash
		}

		const emptyTask: Task = {
			id: ethers.ZeroHash,
			owner: ethers.ZeroAddress,
			rewardPerNode: 0n,
			start: 0n,
			numDays: 0n,
			maxNodeNum: 0n,
			codeHash: ethers.ZeroHash
		}

		const nodes: Node[] = [];

		for (let i = 0; i < Number(task.maxNodeNum) + 1; i++) {
			const pk = ethers.hexlify(ethers.randomBytes(32));
			const teeType = ethers.hexlify(ethers.randomBytes(4));
			const teeVer = ethers.hexlify(ethers.randomBytes(4));
			const attestation = ethers.hexlify(ethers.randomBytes(64));
			const node = {
				pk: pk,
				owner: otherAccounts[i].address,
				teeType: teeType,
				teeVer: teeVer,
				attestation: attestation,
			}
			nodes.push(node);
		}

		return { taskMgr, first, second, otherAccounts, id1, id2, task, emptyTask, nodeInfo, nodes, randBytes };
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
				const deposit = task.rewardPerNode * task.maxNodeNum - 1n;
				await taskMgr.add(task, { value: deposit });
			} catch (err: any) {
				expect(err.message).to.include("Insufficient deposit");
			}
		});
		it("Should not allow zero task id", async function () {
			const { taskMgr, emptyTask } = await loadFixture(deployFixture);

			try {
				await taskMgr.add(emptyTask);
			} catch (err: any) {
				expect(err.message).to.include("Zero id");
			}
		});
		it("Should set the message sender as owner given zero input owner address", async function () {
			const { taskMgr, first, id1, task } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum;
			await taskMgr.add(task, { value: deposit });

			expect(await taskMgr.taskExists(id1)).to.equal(true);
			expect((await taskMgr.getTask(id1)).owner).to.deep.equal(first.address);
		});
		it("Should not allow non-existing code hash", async function () {
			const { taskMgr, task, randBytes } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum;

			const t: Task = { ...task };
			t.codeHash = randBytes(32);

			try {
				await taskMgr.add(task, { value: deposit });
			} catch (err: any) {
				expect(err.message).to.include("Code hash not found");
			}
		});
		it("Should log the correct event and add the correct record", async function () {
			const { taskMgr, second, id1, id2, task, emptyTask } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum + 1n;
			const ret = await taskMgr.connect(second).add(task, { value: deposit });

			task.owner = second.address;
			task.start = BigInt((await ethers.provider.getBlock('latest'))!.timestamp);
			expect(ret).to.emit(taskMgr, "Add").withArgs(task.id, task);

			expect(await taskMgr.taskExists(id1)).to.equal(true);
			expect(await taskMgr.taskExists(id2)).to.equal(false);

			expect(await taskMgr.getTask(id1)).to.deep.equal(Object.values(task));
			expect(await taskMgr.getTask(id2)).to.deep.equal(Object.values(emptyTask));
		});
		it("Should set the correct deposit value", async function () {
			const { taskMgr, id1, task } = await loadFixture(deployFixture);

			const deposit = task.rewardPerNode * task.maxNodeNum + 10n;
			await taskMgr.add(task, { value: deposit });

			expect(await taskMgr.deposit(id1)).to.equal(deposit);
			expect(await taskMgr.getTaskIds()).to.deep.equal([id1]);
		});
	});
	describe("join", function () {
		it("Should not allow non-exist task", async function () {
			const { taskMgr } = await loadFixture(deployFixture);

			const id = ethers.hexlify(ethers.randomBytes(32));
			const pk = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.join(id, pk);
			} catch (err: any) {
				expect(err.message).to.include("Task not found");
			}
		});
		it("Should not allow expired task", async function () {
			const { taskMgr, task } = await loadFixture(deployFixture);

			// Add task
			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });

			// Increase time
			await time.increase(time.duration.days(Number(task.numDays)));
			console.log(`Time set to ${(await ethers.provider.getBlock('latest'))!.timestamp}`);

			const t = await taskMgr.getTask(task.id);
			const expired = t[2] + t[3] * 24n * 3600n;
			console.log(`Task expires at ${expired}`);

			const pk = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.join(task.id, pk);
			} catch (err: any) {
				expect(err.message).to.include("Task expired");
			}
		});
		it("Should not allow non-exist node", async function () {
			const { taskMgr, task } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });

			const pk = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.join(task.id, pk);
			} catch (err: any) {
				expect(err.message).to.include("Node not found");
			}
		});
		it("Should not allow non-node-owner to join", async function () {
			const { taskMgr, second, task, nodeInfo, nodes } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			await nodeInfo.connect(second).addOrUpdate(nodes[0]);

			try {
				await taskMgr.join(task.id, nodes[0].pk);
			} catch (err: any) {
				expect(err.message).to.include("Invalid node owner");
			}
		});
		it("Should not join if task is full", async function () {
			const { taskMgr, second, otherAccounts, task, nodeInfo, nodes } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			for (const node of nodes) {
				await nodeInfo.connect(second).addOrUpdate(node);
			}
			for (let i = 0; i < task.maxNodeNum; i++) {
				await taskMgr.connect(otherAccounts[i]).join(task.id, nodes[i].pk);
			}

			const pk = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.join(task.id, pk);
			} catch (err: any) {
				expect(err.message).to.include("Task full");
			}
		});
		it("Should log the correct event and add the correct record", async function () {
			const { taskMgr, second, otherAccounts, task, nodeInfo, nodes } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			await nodeInfo.connect(second).addOrUpdate(nodes[0]);
			await nodeInfo.connect(second).addOrUpdate(nodes[1]);
			await taskMgr.connect(otherAccounts[0]).join(task.id, nodes[0].pk);

			expect(await taskMgr.connect(otherAccounts[1]).join(task.id, nodes[1].pk))
				.to.emit(taskMgr, "Join").withArgs(task.id, nodes[1].pk);

			expect((await taskMgr.getNodeList(task.id)).length).to.equal(2);
			expect(await taskMgr.getNodeList(task.id)).to.deep.equal([nodes[0].pk, nodes[1].pk]);
		});
	});
	describe("reward", function () {
		it("Should not allow non-owner", async function () {
			const { taskMgr, first, task } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });

			try {
				await taskMgr.reward(task.id, []);
			} catch (err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\"" + first.address + "\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should not allow non-exist task", async function () {
			const { taskMgr, second } = await loadFixture(deployFixture);

			const id = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.connect(second).reward(id, []);
			} catch (err: any) {
				expect(err.message).to.include("Task not found");
			}
		});
		it("Should not be called when task is not yet expired", async function () {
			const { taskMgr, second, task } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			time.increase(time.duration.days(Number(task.numDays)) - 1);

			try {
				await taskMgr.connect(second).reward(task.id, []);
			} catch (err: any) {
				expect(err.message).to.include("Task must be expired");
			}
		});
		it("Should not allow non-exist node", async function () {
			const { taskMgr, second, task } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			time.increase(time.duration.days(Number(task.numDays)));

			const pk = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.connect(second).reward(task.id, [pk]);
			} catch (err: any) {
				expect(err.message).to.include("Node not found");
			}
		});
		it("Should log the correct event and add the correct record", async function () {
			const { taskMgr, second, otherAccounts, task, nodeInfo, nodes } = await loadFixture(deployFixture);
			const pks: string[] = [];

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			for (let i = 0; i < task.maxNodeNum; i++) {
				await nodeInfo.connect(second).addOrUpdate(nodes[i]);
				await taskMgr.connect(otherAccounts[i]).join(task.id, nodes[i].pk);
				pks.push(nodes[i].pk);
			}

			time.increase(time.duration.days(Number(task.numDays)));
			expect(await taskMgr.connect(second).reward(task.id, pks))
				.to.emit(taskMgr, "Reward").withArgs(task.id, pks);

			for (let i = 0; i < task.maxNodeNum; i++) {
				expect(await taskMgr.balance(nodes[i].owner)).to.equal(task.rewardPerNode);
			}
		});
		it("Should not allow repeated reward", async function () {
			const { taskMgr, second, otherAccounts, task, nodeInfo, nodes } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			for (let i = 0; i < task.maxNodeNum; i++) {
				await nodeInfo.connect(second).addOrUpdate(nodes[i]);
				await taskMgr.connect(otherAccounts[i]).join(task.id, nodes[i].pk);
			}

			time.increase(time.duration.days(Number(task.numDays)));
			await taskMgr.connect(second).reward(task.id, [nodes[0].pk]);

			try {
				await taskMgr.connect(second).reward(task.id, [nodes[0].pk]);
			} catch (err: any) {
				expect(err.message).to.include("Node can only be rewarded once");
			}
		});
		it("Should allow separate rewards", async function () {
			const { taskMgr, second, otherAccounts, task, nodeInfo, nodes } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			for (let i = 0; i < task.maxNodeNum; i++) {
				await nodeInfo.connect(second).addOrUpdate(nodes[i]);
				await taskMgr.connect(otherAccounts[i]).join(task.id, nodes[i].pk);
			}

			time.increase(time.duration.days(Number(task.numDays)));
			expect(await taskMgr.connect(second).reward(task.id, [nodes[0].pk]))
				.to.emit(taskMgr, "Reward").withArgs(task.id, [nodes[0].pk]);
			expect(await taskMgr.connect(second).reward(task.id, [nodes[1].pk]))
				.to.emit(taskMgr, "Reward").withArgs(task.id, [nodes[1].pk]);

			expect(await taskMgr.balance(nodes[0].owner)).to.equal(task.rewardPerNode);
			expect(await taskMgr.balance(nodes[1].owner)).to.equal(task.rewardPerNode);
		});
	});
	describe("withdrawDeposit", function () {
		it("Should not allow non-owner", async function () {
			const { taskMgr, first, task } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });

			try {
				await taskMgr.withdrawDeposit(task.id);
			} catch (err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\"" + first.address + "\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should not allow non-exist task", async function () {
			const { taskMgr, second } = await loadFixture(deployFixture);

			const id = ethers.hexlify(ethers.randomBytes(32));

			try {
				await taskMgr.connect(second).withdrawDeposit(id);
			} catch (err: any) {
				expect(err.message).to.include("Task not found");
			}
		});
		it("Should not allow non-expired task", async function () {
			const { taskMgr, second, task } = await loadFixture(deployFixture);

			await taskMgr.add(task, { value: task.rewardPerNode * task.maxNodeNum });
			time.increase(time.duration.days(Number(task.numDays)) - 1);

			try {
				await taskMgr.connect(second).withdrawDeposit(task.id);
			} catch (err: any) {
				expect(err.message).to.include("Task must be expired");
			}
		});
		it("Should log the correct event and set the correct balance", async function () {
			const { taskMgr, second, task } = await loadFixture(deployFixture);

			const value = task.rewardPerNode * task.maxNodeNum;
			await taskMgr.add(task, { value: value });
			time.increase(time.duration.days(Number(task.numDays)));

			expect(await taskMgr.connect(second).withdrawDeposit(task.id))
				.to.emit(taskMgr, "WithdrawDeposit").withArgs(task.id, value);

			expect(await taskMgr.balance(task.owner)).to.equal(value);
			expect(await taskMgr.deposit(task.id)).to.equal(0);
		});
	});
});