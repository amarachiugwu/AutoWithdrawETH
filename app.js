require('dotenv').config();
const ethers = require('ethers');
const contractAbi = require('./contract.json');
const usdtContractAbi = require('./usdtContract.json');

const privateKey = process.env.PRIVATEKEY;
const infuraApiKey = process.env.INFURA_API_KEY;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const ethereumAddress = process.env.ETHEREUM_ADDRESS;
const usdtContractAddress = process.env.USDT_CONTRACT_ADDRESS; // Address of the USDT token contract
const decimals = process.env.DECIMAL;
const reciever = process.env.RECIEVER;

// const provider =  new ethers.InfuraProvider("sepolia",infuraApiKey);
const provider =  new ethers.AlchemyProvider("sepolia",alchemyApiKey);


const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(contractAddress, contractAbi.abi, wallet);
const usdtContract = new ethers.Contract(usdtContractAddress, usdtContractAbi.abi, wallet);



async function main() {
  const filter = {
    address: ethereumAddress,
  };


  provider.on('block', async (blockNumber) => {
    try {
      const block = await provider.getBlock(blockNumber);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to === ethereumAddress && tx.value) {
            console.log('Received ETH:', ethers.formatEther(tx.value),  'ETH');
            console.log('From:', tx.from);

            const _balance = await provider.getBalance(wallet.address); // Get the wallet's balance
            const _balanceInEth = ethers.formatEther(_balance);

            console.log('Wallet Balance before usdt transfer:', _balanceInEth, 'ETH');


            const usdtBalance = await usdtContract.balanceOf(wallet.address);
            console.log('USDT Balance:', usdtBalance.toString());

            // Convert the balance to Wei (1 ETH = 10^18 Wei)
            // const usdtBalanceInWei = ethers.parseUnits(usdtBalance.toString(), decimals)
            const usdtBalanceInWei = usdtBalance.toString()

            // Your code for transferring USDT tokens to another address
            const receiverAddress = reciever; 
            const amountToTransfer = usdtBalanceInWei;
            const transferTx = await usdtContract.transfer(receiverAddress, amountToTransfer);
            await transferTx.wait(); // Wait for the USDT transfer transaction to be mined

            console.log('USDT Tokens transferred to', receiverAddress);


            
            const balance = await provider.getBalance(wallet.address); // Get the wallet's balance
            const balanceInEth = ethers.formatEther(balance);

            console.log('Wallet Balance after usdt transfer:', balanceInEth, 'ETH');

            // Convert the balance to Wei (1 ETH = 10^18 Wei)
            const balanceInWei = ethers.parseEther(balanceInEth);


            // Calculate gas estimate for the transaction
            const gasEstimate = await wallet.estimateGas({
                to: reciever,
                // value: tx.value,
                value: balanceInWei
              });

  
              // Calculate the gas cost
              let gasPrice = await provider.getFeeData();
              const gasPriceGwei = gasPrice.maxFeePerGas
              // the n at the end of number indicates a bigint
              const gasCost = gasEstimate * gasPriceGwei;
            //   const gasCost = (63311323212n) * gasPriceGwei;
  
  
              // Calculate the amount to send after deducting gas cost
              const amountToSend = balanceInWei - gasCost;

              console.log(gasPrice, gasEstimate, gasCost, gasPriceGwei, amountToSend)
  
              console.log('Gas Estimate:', gasEstimate.toString());
              console.log('Gas Cost:', ethers.formatEther(gasCost), 'ETH');
              console.log('Amount to Send:', ethers.formatEther(amountToSend), 'ETH');

            // transfer recieved eth to reciever

            try {
                const tx = await wallet.sendTransaction({
                //   to: contractAddress, // Contract's address
                    to: reciever, // recievers address
                    value: amountToSend, // Send the entire wallet balance to the contract
                });
                await tx.wait(); // Wait for the transaction to be mined
                console.log('ETH sent to contract:', tx.hash);
              } catch (error) {
                console.error('Error sending ETH to the contract:', error);
              }
  
            }
          }
        }
      } catch (error) {
        console.error('Error processing block:', error);
      }
    });

  console.log('Listening for incoming transactions...');
}


main().catch((error) => {
  console.error('Error:', error);
});
