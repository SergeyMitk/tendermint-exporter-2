const dotenv = require('dotenv');
const client = require('prom-client');
const { exec } = require("child_process");
const Web3 = require('web3');
const axios = require('axios');

dotenv.config();

const nodeApi = process.env.NODE_API;
const binary = process.env.BINARY;

let valcons; // variable to store valcons

async function getValcons() { // function to get valcons
  return new Promise((resolve, reject) => {
    exec(`$(which ${binary}) tendermint show-address`, async (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        reject(error.message);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        reject(stderr);
      }
      valcons = stdout.trim();
      resolve();
    });  
  });
}

async function validatorMissedBlocks(registry) {
  await getValcons(); // call getValcons to collect valcons before starting the gauge
  const gauge = new client.Gauge({
    name: 'validator_missed_blocks',
    help: 'Validator missed blocks counter',
    registers: [registry],
  });

  async function collectValidatorMissedBlocks() {
    try {
      const response = await axios.get(nodeApi + "/cosmos/slashing/v1beta1/signing_infos/" + valcons);
      const missed = response.data.val_signing_info.missed_blocks_counter;
      console.log(`Validator missed blocks: ${missed}`);
      gauge.set(parseFloat(missed));
    } catch (err) {
      console.log(err.message);
    }
  }

  setInterval(collectValidatorMissedBlocks, 6000);
}

module.exports = (registry) => {
  validatorMissedBlocks(registry);
};