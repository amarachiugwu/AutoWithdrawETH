require('dotenv').config();
const ethers = require('ethers');

const privateKey = process.env.PRIVATEKEY;
const infuraApiKey = process.env.INFURA_API_KEY;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const ethereumAddress = process.env.ETHEREUM_ADDRESS;
const reciever = process.env.RECIEVER;

// const provider =  new ethers.InfuraProvider("mainnet",infuraApiKey);
const provider =  new ethers.AlchemyProvider("mainnet",alchemyApiKey);


const wallet = new ethers.Wallet(privateKey, provider);



async function main() {
  


  provider.on('block', async (blockNumber) => {
    try {
      const block = await provider.getBlock(blockNumber);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (tx && tx.to === ethereumAddress && tx.value) {
            console.log('Received ETH:', ethers.formatEther(tx.value),  'ETH');
            console.log('From:', tx.from);

            


            
            const balance = await provider.getBalance(wallet.address); // Get the wallet's balance
            const balanceInEth = ethers.formatEther(balance);

            console.log('Wallet Balance:', balanceInEth, 'ETH');

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
