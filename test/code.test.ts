import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, network, artifacts } from "hardhat";
import { expect } from "chai";
import { Code } from "../src/types";
import { CodeManager } from "../src/code";

describe("CodeManager", function () {
	async function deployFixture() {
		const [backend] = await ethers.getSigners();

		// deploy contracts
		const CodeInfo = await ethers.getContractFactory("CodeInfo");
		const codeInfo = await CodeInfo.deploy(backend.address);

		const randBytes = (numBytes: number) => {
			return ethers.hexlify(ethers.randomBytes(numBytes));
		}

		const genCode = () => {
			return {
				hash: randBytes(32),
				url: "https://url.com"
			}
		};
		const codes: Code[] = [genCode(), genCode(), genCode()];

		const provider = new ethers.BrowserProvider(network.provider);
		const codeManager = new CodeManager({
			provider: provider,
			addr: await codeInfo.getAddress(),
			abi: (await artifacts.readArtifact("CodeInfo")).abi
		});
		return { codeManager, codeInfo, backend, codes, randBytes };
	}
	describe("getCode", function () {
		it("should return null if hash does not exist", async function () {
			const { randBytes, codeManager } = await loadFixture(deployFixture);
			expect(await codeManager.getCode(randBytes(32))).to.be.null;
		});
		it("should return correct code info", async function () {
			const { backend, codeInfo, codes, codeManager } = await loadFixture(deployFixture);

			await codeInfo.connect(backend).addOrUpdate(codes[0]);

			expect(await codeManager.getCode(codes[0].hash)).to.deep.equal(codes[0]);
		});
	});
	describe("remove", function () {
		it("Should return error when code hash does not exist", async function () {
			const { randBytes, codeManager, backend } = await loadFixture(deployFixture);
			expect((await codeManager.remove(backend, randBytes(32)))!.message).to.equal("Code does not exist");
		});
		it("Should return true when node exists", async function () {
			const { codeManager, backend, codeInfo, codes } = await loadFixture(deployFixture);
			await codeInfo.connect(backend).addOrUpdate(codes[0]);
			expect(await codeManager.remove(backend, codes[0].hash)).to.be.null;
		});
	});
	describe("addOrUpdate", function () {
		it("Should add correct code info", async function () {
			const { codeManager, backend, codes } = await loadFixture(deployFixture);
			expect(await codeManager.addOrUpdate(backend, codes[0])).to.be.null;
			expect(await codeManager.getCode(codes[0].hash)).to.deep.equal(codes[0]);
		});
	});
});