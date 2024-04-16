const hre = require("hardhat");

async function main() {
    console.log("Increasing time (25 hours) on hardhat testnetwork:..." )
    await hre.network.provider.send("evm_increaseTime",["90000"])
    console.log("Done")
}

main()
    .then( () => process.exit(0))
    .catch( error => {
        console.error(error);
        process.exit(1);
    });
