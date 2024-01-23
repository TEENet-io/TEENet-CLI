import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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

		const genTask = (owner: string, maxNodeNum: number, numDays: number) => {
			return {
				id: randBytes(32),
				owner: owner,
				rewardPerNode: 100,
				start: 0,
				numDays: numDays,
				maxNodeNum: maxNodeNum,
				codeHash: codeHash
			}
		};

		// Generate tasks for testing
		const tasks: Task[] = [
			genTask(otherAccounts[0].address, 1, 1),
			genTask(otherAccounts[1].address, 1, 2),
			genTask(otherAccounts[2].address, 2, 2),
			genTask(otherAccounts[2].address, 3, 3),
		];

		const provider = new ethers.BrowserProvider(network.provider);
		const taskManager = new TaskManager({
			provider,
			addr: await taskMgr.getAddress(),
			abi: (await artifacts.readArtifact("TaskMgr")).abi
		});

		return { provider, taskManager, taskMgr, backend, otherAccounts, tasks, nodes, randBytes };
	}
	
	describe("addTask", function () {
		it("Should fail with insufficient balance", async function () {
			const { tasks, taskManager } = await loadFixture(deployFixture);

			const task = {...tasks[0]};
			const wallet = ethers.Wallet.createRandom();
			task.owner = wallet.address;

			expect((await taskManager.addTask(wallet, tasks[0]))!.message).to.be.equal("Insufficient balance");
		});
		it("Should add task without error", async function () {
			const { tasks, taskManager, otherAccounts } = await loadFixture(deployFixture);
			expect(await taskManager.addTask(otherAccounts[0], tasks[0])).to.be.null;
		});
	});

	describe("joinTask", function () {
		it("Should join task", async function () {
			const { taskMgr, tasks, taskManager, otherAccounts, nodes } = await loadFixture(deployFixture);

			const deposit = tasks[0].rewardPerNode * tasks[0].maxNodeNum;
			await taskMgr.connect(otherAccounts[0]).add(tasks[0], { value: deposit });
			const values = await taskMgr.getTask(tasks[0].id);
			tasks[0].start = Number(values[3]);

			expect(await taskManager.joinTask(otherAccounts[9], tasks[0].id, nodes[0].pk)).to.be.null;
			expect(await taskMgr.getNodeList(tasks[0].id)).to.deep.equal([nodes[0].pk]);
		});
	});

	describe("getTasks", function () {
		it("Should get added tasks", async function () {
			const { taskMgr, tasks, taskManager, otherAccounts } = await loadFixture(deployFixture);

			for (let i = 0; i < tasks.length; i++) {
				const task = tasks[i];
				const deposit = task.rewardPerNode * task.maxNodeNum;
				await taskMgr.connect(otherAccounts[i]).add(tasks[i], { value: deposit });
				const values = await taskMgr.getTask(task.id);
				tasks[i].start = Number(values[3]);
			}

			const test = function (task: Task, tasks: Task[]): boolean {
				for (const t of tasks) {
					if (t.id == task.id) {
						expect(t).to.deep.equal(task);
						return true;
					}
				}
				return false;
			}
			
			const ret = await taskManager.getTasks();
			if(ret instanceof Error) {
				assert.fail(ret.message);
			}

			expect(ret.length).to.equal(tasks.length);
			ret.forEach((task: Task) => {
				expect(test(task, tasks)).to.be.true;
			});
		});
	});

	describe("getTaskIds", function () {
		it("hould get correct task ids", async function () {
			const { taskMgr, tasks, taskManager, otherAccounts } = await loadFixture(deployFixture);

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