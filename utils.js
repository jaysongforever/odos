const ethers = require('ethers');
const { privateKey, rpc } = require('./config.json')



const getJsonRpcProvider = () => {
  return new ethers.providers.JsonRpcProvider(rpc);
}

const getSigner = () => {
  const provider = getJsonRpcProvider()
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet.connect(provider)
}

const getContractSigner = (contractAddress, abi, signer) => {
  return new ethers.Contract(contractAddress, abi, signer)
}

const getTokenBalance = async (isErc20, contractAddress, abi) => {
  const signer = getSigner()
  if (isErc20) {
    const erc20Signer = getContractSigner(contractAddress, abi, signer)
    return erc20Signer.balanceOf(signer.getAddress())
  } else {
    const provider = getJsonRpcProvider()
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet.getBalance()
  }
}


const sleep = (time) => {
  let startTime = new Date().getTime() + parseInt(time, 10)
  while(new Date().getTime() < startTime) {}
}

const getRandomArr = (arr) => {
  return arr.sort(() => {
    return Math.random() - 0.5
  })
}




module.exports.getJsonRpcProvider = getJsonRpcProvider
module.exports.getSigner = getSigner
module.exports.getContractSigner = getContractSigner
module.exports.getTokenBalance = getTokenBalance
module.exports.sleep = sleep
module.exports.getRandomArr = getRandomArr