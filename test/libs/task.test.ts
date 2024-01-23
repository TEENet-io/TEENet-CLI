import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, network, artifacts } from "hardhat";
import { expect, assert } from "chai";
import { Task, Node } from "../../src/libs/types";
import { TaskManager } from "../../src/libs/task";

describe("TaskMgr", function () {
	async function deployFixture() {
		const [backend, ...otherAccounts] = await ethers.getSigners();

		// deploy contracts
		const NodeInfo = await ethers.getContractFactory("NodeInfo");
		const nodeInfo = await NodeInfo.deploy(backend.address);
		const CodeInfo = await ethers.getContractFactory("CodeInfo");
		const codeInfo = await CodeInfo.deploy(backend.address);
		const TaskMgr = await ethers.getContractFactory("TaskMgr");
		const taskMgr = await TaskMgr.deploy(backend.address, await nodeInfo.getAddress(), await codeInfo.getAddress());

		const randBytes = (numBytes: number) => {
			return ethers.hexlify(ethers.randomBytes(numBytes));
		}

		// Add verified code info
		const codeHash = randBytes(32);
		await codeInfo.addOrUpdate({ hash: codeHash, url: "https://url.com" });

		const genNode = (owner: string) => {
			return {
				pk: randBytes(32),
				owner: owner,
				teeType: randBytes(8),
				teeVer: randBytes(8),
				attestation: randBytes(32)
			}
		};

		// Add nodes for testing
		const nodes: Node[] = [
			genNode(otherAccounts[9].address),
			genNode(otherAccounts[8].address),
			genNode(otherAccounts[7].address),
		];
		for(const node of nodes) {
			await nodeInfo.connect(backend).addOrUpdate(node);
		}

		const genTask = (owner: string, maxNodeNum: bigint, numDays: bigint) => {
			return {
				id: randBytes(32),
				owner: owner,
				rewardPerNode: 100n,
				start: 0n,
				numDays: numDays,
				maxNodeNum: maxNodeNum,
				codeHash: codeHash
			}
		};

		const provider = new ethers.BrowserProvider(network.provider);
		const taskManager = new TaskManager({
			provider,
			addr: await taskMgr.getAddress(),
			abi: (await artifacts.readArtifact("TaskMgr")).abi
		});

		return { provider, taskManager, taskMgr, backend, otherAccounts, nodes, randBytes, genTask };
	}

	describe("withdraw", function () {
		it("Should have zero balance after withdraw", async function () {
			const { taskManager, genTask, otherAccounts, nodes, backend } = await loadFixture(deployFixture);

			const task = genTask(otherAccounts[0].address, 1n, 1n);
			expect(await taskManager.addTask(otherAccounts[0], task)).to.be.null;
			expect(await taskManager.joinTask(otherAccounts[9], task.id, nodes[0].pk)).to.be.null;
			time.increase(time.duration.days(Number(task.numDays)));
			expect(await taskManager.reward(backend, task.id, [nodes[0].pk])).to.be.null;
			expect(await taskManager.balance(otherAccounts[9].address)).to.equal(task.rewardPerNode);

			expect(await taskManager.withdraw(otherAccounts[9])).to.be.null;
			expect(await taskManager.balance(otherAccounts[9].address)).to.equal(0n);
		});
	});

	describe("reward", function () {
		it("Should set correct balances", async function () {
			const { genTask, taskManager, otherAccounts, nodes, backend } = await loadFixture(deployFixture);

			const _task = genTask(otherAccounts[0].address, 2n, 1n);
			await taskManager.addTask(otherAccounts[0], _task);
			const task = await taskManager.getTask(_task.id);
			if (task instanceof Error) {
				assert.fail(task.message);
			}
			task.start = _task.start;

			expect(await taskManager.joinTask(otherAccounts[9], task.id, nodes[0].pk)).to.be.null;
			expect(await taskManager.joinTask(otherAccounts[8], task.id, nodes[1].pk)).to.be.null;
			expect(await taskManager.balance(otherAccounts[9].address)).to.equal(0n);
			expect(await taskManager.balance(otherAccounts[8].address)).to.equal(0n);

			time.increase(time.duration.days(Number(task.numDays)));

			expect(await taskManager.reward(backend, task.id, [nodes[0].pk])).to.be.null;
			expect(await taskManager.balance(otherAccounts[9].address)).to.equal(task.rewardPerNode);
			expect(await taskManager.balance(otherAccounts[8].address)).to.equal(0n);
		});
	});	
	
	describe("addTask", function () {
		it("Should fail with insufficient balance", async function () {
			const { genTask, taskManager } = await loadFixture(deployFixture);

			const wallet = ethers.Wallet.createRandom();
			const task = genTask(wallet.address, 1n, 1n);

			expect((await taskManager.addTask(wallet, task))!.message).to.be.equal("Insufficient balance");
		});
		it("Should add task without error", async function () {
			const { genTask, taskManager, otherAccounts } = await loadFixture(deployFixture);
			const task = genTask(otherAccounts[0].address, 1n, 1n);
			expect(await taskManager.addTask(otherAccounts[0], task)).to.be.null;
		});
	});

	describe("joinTask", function () {
		it("Should join task", async function () {
			const { taskMgr, taskManager, otherAccounts, nodes, genTask } = await loadFixture(deployFixture);

			const task = genTask(otherAccounts[0].address, 1n, 1n);

			const deposit = task.rewardPerNode * task.maxNodeNum;
			await taskMgr.connect(otherAccounts[0]).add(task, { value: deposit });
			const values = await taskMgr.getTask(task.id);
			task.start = values[3];

			expect(await taskManager.joinTask(otherAccounts[9], task.id, nodes[0].pk)).to.be.null;
			expect(await taskMgr.getNodeList(task.id)).to.deep.equal([nodes[0].pk]);
		});
	});

	describe("getTask", function () {
		it("Should get added tasks", async function () {
			const { taskManager, otherAccounts, genTask } = await loadFixture(deployFixture);

			const expected = genTask(otherAccounts[0].address, 1n, 1n);
			await taskManager.addTask(otherAccounts[0], expected);
			const actual = await taskManager.getTask(expected.id);
			if(actual instanceof Error) {
				assert.fail(actual.message);
			}
			expected.start = actual.start;
			expect(actual).to.deep.equal(expected);
		});
	});

	describe("getTaskIds", function () {
		it("hould get correct task ids", async function () {
			const { taskMgr, genTask, taskManager, otherAccounts } = await loadFixture(deployFixture);

			const tasks: Task[] = [
				genTask(otherAccounts[0].address, 1n, 1n),
				genTask(otherAccounts[1].address, 1n, 2n),
				genTask(otherAccounts[2].address, 2n, 2n),
				genTask(otherAccounts[2].address, 3n, 3n),
			];

			expect(await taskManager.getTaskIds()).to.deep.equal([]);

			const actual: string[] = [];
			for (let i = 0; i < tasks.length; i++) {
				const task = tasks[i];
				const deposit = task.rewardPerNode * task.maxNodeNum;
				await taskMgr.connect(otherAccounts[i]).add(tasks[i], { value: deposit });
				actual.push(tasks[i].id);
			}
			expect(await taskManager.getTaskIds()).to.deep.equal(actual);
		});
	});
});