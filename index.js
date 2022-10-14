const ethers = require('ethers');
const { sleep, getRandomArr, getContractSigner, getTokenBalance } = require('./utils')

const _axios = require('axios')
const HttpsProxyAgent = require("https-proxy-agent")
const httpsAgent = new HttpsProxyAgent(`http://127.0.0.1:7890`)
const axios = _axios.create({proxy: false, httpsAgent})

const { privateKey, rpc, odosAddress, odosAbi } = require('./config.json')
const provider = new ethers.providers.JsonRpcProvider(rpc);
// 获取Odos可写签名者
const wallet = new ethers.Wallet(privateKey, provider);
const signer = wallet.connect(provider)
const odosContractSigner = getContractSigner(odosAddress, odosAbi, signer)

const tokensList = require('./tokens')
const tokens = getRandomArr(tokensList)

;(async () => {
  const getSwapInfo = (fromToken, fromValues, toTokens, walletAddress, slippageAmount) => {
    const res = axios({
      method: 'post',
      url: `https://app.odos.xyz/request-path`,
      data: {
        chain: "arbitrum",
        fromTokens: [fromToken],
        fromValues: [fromValues],
        gasPrice: 0.1,
        lpBlacklist: [],
        slippageAmount,
        toTokens: [toTokens],
        walletAddress
      },
      headers: {
        authority: "app.odos.xyz",
        path: '/request-path',
        scheme: 'https',
        accept: '*/*',
        'accept-encoding': "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "content-type": "application/json",
        cookie: "_ga=GA1.1.467396030.1665577939; _ga_ZMSM2ECSQQ=GS1.1.1665577938.1.0.1665578034.0.0.0",
        origin: "https://app.odos.xyz",
        referer: "https://app.odos.xyz/",
        "sec-ch-ua": '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "Windows",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "x-sec-fetch-site": "same-origin"
      },
    })
    return res
  }

  const swap = async (fromToken, fromValues, inputDests, outTokens, outAmounts, walletAddress, pathDefBytes, slippageAmount, gasLimit, token, index) => {
    const valueOutQuote = outAmounts + ''
    const valueOutMin = outAmounts * (1 - slippageAmount / 100) + ''
    console.log(index, token, `Swap Info: valueOutQuote = ${valueOutQuote} valueOutMin = ${valueOutMin}`)
    const params = {
      inputs: [{ tokenAddress: fromToken, amountIn: ethers.utils.parseEther(fromValues + ''), receiver: inputDests, permit: "0x" }],
      outputs: [{tokenAddress: outTokens, relativeValue: '1', receiver: walletAddress}],
      valueOutQuote: ethers.utils.parseEther(valueOutQuote),
      valueOutMin: ethers.utils.parseEther(valueOutMin),
      executor: inputDests,
      pathDefBytes: '0x' + pathDefBytes
    }
    const resp = await odosContractSigner.swap(params.inputs, params.outputs, params.valueOutQuote, params.valueOutMin, params.executor, params.pathDefBytes, {
      gasLimit,
      gasPrice: ethers.utils.parseEther("0.0000000001"),
      value: ethers.utils.parseEther(fromValues + '')
    })
    return resp.wait()
  }

  const approve = async (contract, abi, signer) => {
    const contractSigner = getContractSigner(contract, abi, signer)
    // const nonce = await provider.getTransactionCount(wallet.address)
    const resp = await contractSigner.approve(odosAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
    return resp.wait()
  }

  const tokenSwap = async (fromToken, fromValues, toTokens, walletAddress, slippageAmount, gasLimit, nowSwapToken, nowSwapTokenIndex) => {
    const res = await getSwapInfo(fromToken, fromValues, toTokens, walletAddress, slippageAmount)
    if (res && res.data) {
      const { inputDests, outTokens, outAmounts, pathDefBytes } = res.data
      return swap(fromToken, fromValues, inputDests[0], outTokens[0], outAmounts[0], walletAddress, pathDefBytes, slippageAmount, gasLimit, nowSwapToken, nowSwapTokenIndex)
    }
  }
  
  const successTokens = [] // 存放swap成功的token
  const failTokens = [] // 存放swap失败的token
  for(let i = 0; i< tokens.length; i++) {
    const balance = await wallet.getBalance()
    if (ethers.utils.formatUnits(balance) < 0.02) break;
    const params = {
      fromToken: "0x0000000000000000000000000000000000000000",
      fromValues: (Math.random() * 0.001 + 0.016).toFixed(5) * 1, // 0.01600-0.01700
      toTokens: tokens[i].contract,
      walletAddress: wallet.address,
      slippageAmount: 3,
      gasLimit: parseInt(Math.random() * 500000 + 500000) + 800000 // 130000-180000
    }
    try {
      // Eth => Erc20
      const receipt = await tokenSwap(params.fromToken, params.fromValues, params.toTokens, params.walletAddress, params.slippageAmount, params.gasLimit, tokens[i].token, i+1)
      if (receipt && receipt.transactionHash) {
        console.log(i+1, tokens[i].token, `Swap TX: ${receipt.transactionHash}`)
        successTokens.push(tokens[i].token)
        // sleep(20 * 1000)
        const receiptApprove = await approve(tokens[i].contract, tokens[i].abi, signer)
        if (receiptApprove && receiptApprove.transactionHash) {
          console.log(i+1, tokens[i].token, `Approve TX: ${ receiptApprove.transactionHash}`)

          const balance = await getTokenBalance(true, tokens[i].contract, tokens[i].abi)
          console.log('🚀 ~ file: index.js ~ line 118 ~ ; ~ balance', ethers.utils.formatUnits(balance, 'ether'))
          // Erc20 => Eth
          // await tokenSwap(params.toTokens, )
        }
      }
    } catch (error) {
      failTokens.push(tokens[i].token)
      console.log('🚀 ~ file: index.js ~ line 84 ~ ; ~ error', error)
    }
    const needSwapTokens = tokens.filter(item => !successTokens.includes(item.token)).map(item => item.token)
    console.log(i+1, `Now Swap successTokens:`, successTokens, `failTokens:`, failTokens, `needSwapTokens:`, needSwapTokens)
    // sleep(20 * 1000)
  }
})()
