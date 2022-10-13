const ethers = require('ethers');
const _axios = require('axios')
const { privateKey, rpc, odosAddress } = require('./config.json')
const odosAbi = require('./ososAbi.json')
const provider = new ethers.providers.JsonRpcProvider(rpc);
const tokens = require('./tokens')

const HttpsProxyAgent = require("https-proxy-agent")

const httpsAgent = new HttpsProxyAgent(`http://127.0.0.1:7890`)
const axios = _axios.create({proxy: false, httpsAgent})

;(async () => {
  const wallet = new ethers.Wallet(privateKey, provider);
  const signer = wallet.connect(provider)
  const contractSigner = new ethers.Contract(odosAddress, odosAbi, signer)

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

  const swap = async (fromToken, fromValues, inputDests, outTokens, outAmounts, walletAddress, pathDefBytes, slippageAmount, gasLimit) => {
    const valueOutQuote = outAmounts + ''
    const valueOutMin = outAmounts * (1 - slippageAmount / 100) + ''
    console.log('🚀 ~ file: index.js ~ line 58 ~ swap ~ valueOutQuote - valueOutMin', valueOutQuote, valueOutMin)
    const params = {
      inputs: [{ tokenAddress: fromToken, amountIn: ethers.utils.parseEther(fromValues + ''), receiver: inputDests, permit: "0x" }],
      outputs: [{tokenAddress: outTokens, relativeValue: '1', receiver: walletAddress}],
      valueOutQuote: ethers.utils.parseEther(valueOutQuote),
      valueOutMin: ethers.utils.parseEther(valueOutMin),
      executor: inputDests,
      pathDefBytes: '0x' + pathDefBytes
    }
    const resp = await contractSigner.swap(params.inputs, params.outputs, params.valueOutQuote, params.valueOutMin, params.executor, params.pathDefBytes, {
      gasLimit,
      gasPrice: ethers.utils.parseEther("0.0000000001"),
      value: ethers.utils.parseEther(fromValues + '')
    })
    return resp.wait()
  }
  
  for(let i = 0; i< tokens.length; i++) {
    const params = {
      fromToken: "0x0000000000000000000000000000000000000000",
      fromValues: 0.0165,
      toTokens: tokens[i].contract,
      walletAddress: wallet.address,
      slippageAmount: 3,
      gasLimit: 4306174
    }
    try {
      const res = await getSwapInfo(params.fromToken, params.fromValues, params.toTokens, params.walletAddress, params.slippageAmount)
      if (res && res.data) {
        const { inputDests, outTokens, outAmounts, pathDefBytes } = res.data
        const receipt = await swap(params.fromToken, params.fromValues, inputDests[0], outTokens[0], outAmounts[0], params.walletAddress, pathDefBytes, params.slippageAmount, params.gasLimit)
        console.log('🚀 ~ file: index.js ~ line 33 receipt',i+1, tokens[i].token, receipt.transactionHash)
      } 
    } catch (error) {
      console.log('🚀 ~ file: index.js ~ line 84 ~ ; ~ error', error)
    }
  }
})()
