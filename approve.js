const ethers = require('ethers');
const { privateKey, rpc, odosAddress } = require('./config.json')
const provider = new ethers.providers.JsonRpcProvider(rpc);
const tokens = require('./tokens')

;(async () => {
  for(let i = 0; i < tokens.length; i++) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const signer = wallet.connect(provider)
    const contractSigner = new ethers.Contract(tokens[i].contract, tokens[i].abi, signer)
    // const nonce = await provider.getTransactionCount(wallet.address)
    const resp = await contractSigner.approve(odosAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
    const receipt = await resp.wait()
    console.log('🚀 ~ approve', i+1, tokens[i].token, receipt.transactionHash)
  }
})()