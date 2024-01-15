import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("CodeInfo", function () {
	async function deployFixture() {
		const [first, second] = await ethers.getSigners();

		const CodeInfo = await ethers.getContractFactory("CodeInfo");
		const codeInfo = await CodeInfo.deploy(second.address);

		const hash1 = ethers.randomBytes(32);
		const hash2 = ethers.randomBytes(32);

		const url = "https://urls1";

		return { codeInfo, first, second, hash1, hash2, url };
  	}

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			const { codeInfo, second } = await loadFixture(deployFixture);
			expect(await codeInfo.owner()).to.equal(second.address);
		});
	});

	describe("addOrUpdate", function () {
		it("Should not allow non-owner to operate", async function () {
			const { codeInfo, first, hash1, url } = await loadFixture(deployFixture);
			
			try {
				await codeInfo.connect(first).addOrUpdate(hash1, url);
			} catch(err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\""+first.address+"\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should log the correct event and add the correct record", async function () {
			const { codeInfo, second, hash1, hash2, url } = await loadFixture(deployFixture);
			expect(await codeInfo.connect(second).addOrUpdate(hash1, url)).to.emit(codeInfo, "AddOrUpdate").withArgs(hash1, url);
			expect(await codeInfo.codeExists(hash1)).to.equal(true);
			expect(await codeInfo.codeExists(hash2)).to.equal(false);
			expect(await codeInfo.getUrl(hash1)).to.equal(url);
			expect(await codeInfo.getUrl(hash2)).to.equal("");
		});
	});

	describe("remove", function () {
		it("Should not allow non-owner to operate", async function () {
			const { codeInfo, first, hash1, url } = await loadFixture(deployFixture);
			
			try {
				await codeInfo.connect(first).addOrUpdate(hash1, url);
			} catch(err: any) {
				const errMsg = "OwnableUnauthorizedAccount(\""+first.address+"\")";
				expect(err.message).to.include(errMsg);
			}
		});
		it("Should remove data correctly", async function () {
			const { codeInfo, second, hash1, url } = await loadFixture(deployFixture);
			expect(await codeInfo.connect(second).addOrUpdate(hash1, url)).to.emit(codeInfo, "AddOrUpdate").withArgs(hash1, url);
			expect(await codeInfo.connect(second).remove(hash1)).to.emit(codeInfo, "Remove").withArgs(hash1);
			expect(await codeInfo.codeExists(hash1)).to.equal(false);
			expect(await codeInfo.getUrl(hash1)).to.equal("");
		});
	});
});