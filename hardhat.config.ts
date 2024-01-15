import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  paths: {
	sources: "./src/contracts",
	tests: "./test/contracts",
  },
};

export default config;
