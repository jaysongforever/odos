const ethers = require('ethers');
const { privateKey, rpc, odosAddress } = require('./config.json')
const odosAbi = require('./ososAbi.json')
const provider = new ethers.providers.JsonRpcProvider(rpc);
const tokens = require('./tokens')

;(async () => {
  const wallet = new ethers.Wallet(privateKey, provider);
  const signer = wallet.connect(provider)
  const contractSigner = new ethers.Contract(odosAddress, odosAbi, signer)

  const swap = async () => {
    const params = {
      inputs: [{ tokenAddress: "0x0000000000000000000000000000000000000000", amountIn: ethers.utils.parseEther('0.016'), receiver: "0x3373605b97d079593216a99ceF357C57D1D9648e", permit: "0x" }],
      outputs: [{tokenAddress: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8", relativeValue: '1', receiver: wallet.address}],
      valueOutQuote: ethers.utils.parseEther('0.01539'),
      valueOutMin: ethers.utils.parseEther('0.01524'),
      executor: "0x3373605b97d079593216a99ceF357C57D1D9648e",
      pathDefinition: "0x01020300050101020b0001010201ff000000000000000000000000000000000009ba302a3f5ad2bf8853266e271b005a5b3716fe82af49447d8a07e3bd95bd0d56f35241523fbab1"
    }
    const resp = await contractSigner.swap(params.inputs, params.outputs, params.valueOutQuote, params.valueOutMin, params.executor, params.pathDefinition, {
      gasLimit: 2239872,
      gasPrice: ethers.utils.parseEther("0.0000000001"),
      value: ethers.utils.parseEther("0.016")
    })
    return resp.wait()
  }

  const receipt = await swap()
  console.log('🚀 ~ file: index.js ~ line 33 ~ ; ~ receipt', receipt.transactionHash)

})()
