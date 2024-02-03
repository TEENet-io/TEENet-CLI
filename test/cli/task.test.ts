import { execSync } from 'child_process';
import { join } from 'path';
import { JsonRpcProvider } from 'ethers';
import { loadFile, writeFile } from '../cli/common';
import { TaskManagerErr } from '../../src/cli/task';
import { Task } from '../../src/libs/types';
import { expect } from 'chai';
import { randBytes } from '../../src/libs/common';
import { printTaskList, files } from '../../src/cli/common';

export function test(cmd: string): string {
	try {
		return execSync(`node ${join(__dirname, '../../cmd/cli.js')} ${cmd}`).toString();
	} catch (err: any) {
		return err.output[1].toString();
	}
}

describe('CLI Task', function () {
	before(function () {
		execSync(`npx ts-node ${join(__dirname, '../../script/deployOnHardhat.ts')}`);
		execSync(`npx ts-node ${join(__dirname, './prepareData.ts')}`);
		test('code addOrUpdate 0 code0.json');
		test('node add 0 node.w9.json');
		test('node add 0 node.w8.json');
		test('node add 0 node.w7.json');
	});
	describe('add check', function () {
		it('should fail with non-existing file', function () {
			const actual = test(`task add 0 non-existing-file.json`);
			const expected = 'non-existing-file.json';
			expect(actual).to.include(expected);
		});
	});
	describe('get check', function () {
		it('should fail with invalid task id', function () {
			const id = randBytes(30);
			const actual = test(`task get ${id}`);
			const expected = TaskManagerErr.InvalidId(id).message;
			expect(actual).to.include(expected);
		});
		it('should fail with non-existing task id', function () {
			const id = randBytes(32);
			const actual = test(`task get ${id}`);
			const expected = TaskManagerErr.TaskNotFound(id).message;
			expect(actual).to.include(expected);
		});
	});
	describe('reward check', function () {
		it('should fail with non-existing file', function () {
			const actual = test(`task reward 0 non-existing-file.json`);
			const expected = 'non-existing-file.json';
			expect(actual).to.include(expected);
		});
		it('should fail with invalid task id in file', function () {
			const file = 'reward.invalid.json';
			const rewardReq = { id: randBytes(30), pks: [] };
			writeFile(file, rewardReq);
			const actual = test(`task reward 0 ${file}`);
			const expected = TaskManagerErr.InvalidId(rewardReq.id).message;
			expect(actual).to.include(expected);
		});
		it('should fail with invalid pk in file', function () {
			const file = 'reward.invalid.json';
			const rewardReq = { id: randBytes(32), pks: [randBytes(30)] };
			writeFile(file, rewardReq);
			const actual = test(`task reward 0 ${file}`);
			const expected = TaskManagerErr.InvalidPk(rewardReq.pks[0]).message;
			expect(actual).to.include(expected);
		});
	});
	describe('join check', function () {
		it('should fail with invalid task id', function () {
			const id = randBytes(30);
			const pk = randBytes(32);
			const actual = test(`task join 0 ${id} ${pk}`);
			const expected = TaskManagerErr.InvalidId(id).message;
			expect(actual).to.include(expected);
		});
		it('should fail with invalid pk', function () {
			const id = randBytes(32);
			const pk = randBytes(30);
			const actual = test(`task join 0 ${id} ${pk}`);
			const expected = TaskManagerErr.InvalidPk(pk).message;
			expect(actual).to.include(expected);
		});
	});
	describe('rundown', function () {
		test('task update');

		it('should get empty task list', function () {
			const actual = test('task list');
			const expected = TaskManagerErr.EmptyTaskList().message;
			expect(actual).to.include(expected);
		});
		it('should add task', function () {
			const file = 'task.w1.d1.n1.json';
			const task = loadFile(file) as Task;
			const actual = test(`task add 1 ${file}`);
			expect(actual).to.include('ID: ' + task.id);
		});
		it('should get task', function () {
			test(`task update`);
			const file = 'task.w1.d1.n1.json';
			const task = loadFile(file) as Task;
			const actual = test(`task get ${task.id}`);
			expect(actual).to.include('ID: ' + task.id);
			expect(actual).to.include('Node list: ' + JSON.stringify([], null, 2));
		});
		it('should list task', function () {
			const data = loadFile(files.task);
			const actual = test(`task list`);
			const expected = printTaskList(data.tasks, data.nodeLists);
			expect(actual).to.include(expected);
		});
		it('should join task', function () {
			const task = loadFile('task.w1.d1.n1.json') as Task;
			const node = loadFile('node.w9.json');
			let actual = test(`task join 9 ${task.id} ${node.pk}`);
			let expected = `Joined task\nid=${task.id}\npk=${node.pk}`;
			expect(actual).to.include(expected);

			test(`task update`);

			actual = test(`task get ${task.id}`);
			expected = `Node list: ${JSON.stringify([node.pk], null, 2)}`;
			expect(actual).to.include(expected);
		});
		it('should distribute reward', async function () {
			const task = loadFile('task.w1.d1.n1.json') as Task;
			const node = loadFile('node.w9.json');
			const provider = new JsonRpcProvider('http://localhost:8545');
			await provider.send('evm_mine', []);
			await provider.send('evm_increaseTime', [24 * 60 * 60 * Number(task.numDays)]);
			const req = { id: task.id, pks: [node.pk] };
			const file = 'rewardReq.json';
			writeFile(file, req);
			const actual = test(`task reward 0 ${file}`);
			expect(actual).to.include(`Reward distributed\nid=${task.id}\npks=${JSON.stringify([node.pk])}`);
		});
		it('should withdraw balance', function () {
			const task = loadFile('task.w1.d1.n1.json') as Task;
			let actual = test(`task balance 9`);
			expect(actual).to.include(`${task.rewardPerNode}`);
			test(`task withdraw 9`);
			actual = test(`task balance 9`);
			expect(actual).to.include(`0`);
		});
	});
});