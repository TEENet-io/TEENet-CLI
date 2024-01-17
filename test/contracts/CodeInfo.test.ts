import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Code } from "../../src/types";

describe("CodeInfo", function () {
	async function deployFixture() {
		const [first, second] = await ethers.getSigners();

		const CodeInfo = await ethers.getContractFactory("CodeInfo");
		const codeInfo = await CodeInfo.deploy(second.address);

		const hash1 = ethers.hexlify(ethers.randomBytes(32));
		const hash2 = ethers.hexlify(ethers.randomBytes(32));

		const code: Code = {
			hash: hash1,
			url: "https://urls1"
		}

		const emptyCode: Code = {
			hash: ethers.ZeroHash,
			url: ""
		}

		return { codeInfo, first, second, hash1, hash2, code, emptyCode };
	}

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			const { codeInfo, second } = await loadFixture(deployFixture);
			expect(await codeInfo.owner()).to.equal(second.address);
		});
	});

	describe("addOrUpdate", function () {
		it("Should not allow non-owner to operate", async function () {
			const { codeInfo, first, code } = await loadFixture(deployFixture);

			try {
				await codeInfo.connect(first).addOrUpdate(code);
			} catch (err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\"" + first.address + "\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should not allow zero hash", async function () {
			const { codeInfo, second, emptyCode } = await loadFixture(deployFixture);

			try {
				await codeInfo.connect(second).addOrUpdate(emptyCode);
			} catch (err: any) {
				expect(err.message).to.include("Invalid hash");
			}
		});
		it("Should log the correct event and add the correct record", async function () {
			const { codeInfo, second, hash1, hash2, code, emptyCode } = await loadFixture(deployFixture);

			expect(await codeInfo.connect(second).addOrUpdate(code)).to.emit(codeInfo, "AddOrUpdate").withArgs(code);
			expect(await codeInfo.codeExists(hash1)).to.equal(true);
			expect(await codeInfo.codeExists(hash2)).to.equal(false);
			expect(await codeInfo.getCode(hash1)).to.deep.equal(Object.values(code));
			expect(await codeInfo.getCode(hash2)).to.deep.equal(Object.values(emptyCode));
		});
		it("Should log the correct event and update the correct record", async function () {
			const { codeInfo, second, hash1, code } = await loadFixture(deployFixture);
			expect(await codeInfo.connect(second).addOrUpdate(code)).to.emit(codeInfo, "AddOrUpdate").withArgs(hash1, code);

			const newCode: Code = {
				hash: hash1, 
				url: "https://new_urls",
			}
			expect(await codeInfo.connect(second).addOrUpdate(newCode)).to.emit(codeInfo, "AddOrUpdate").withArgs(hash1, newCode);
			expect(await codeInfo.getCode(hash1)).to.deep.equal(Object.values(newCode));
		});
	});

	describe("remove", function () {
		it("Should not allow non-owner to operate", async function () {
			const { codeInfo, first, code } = await loadFixture(deployFixture);

			try {
				await codeInfo.connect(first).addOrUpdate(code);
			} catch (err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\"" + first.address + "\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should remove data correctly", async function () {
			const { codeInfo, second, hash1, code, emptyCode } = await loadFixture(deployFixture);
			expect(await codeInfo.connect(second).addOrUpdate(code)).to.emit(codeInfo, "AddOrUpdate").withArgs(hash1, code);
			expect(await codeInfo.connect(second).remove(hash1)).to.emit(codeInfo, "Remove").withArgs(hash1);
			expect(await codeInfo.codeExists(hash1)).to.equal(false);
			expect(await codeInfo.getCode(hash1)).to.deep.equal(Object.values(emptyCode));
		});
	});
});