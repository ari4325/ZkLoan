import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import getConfig from './config'
import Big from 'big.js';
import { setMessage } from '..';

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

const BOATLOAD_OF_GAS = Big(10).times(10 ** 14).toFixed();

// Initialize contract & set global variables
export async function initContract() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  window.walletConnection = new WalletConnection(near)

  // Getting the Account ID. If still unauthorized, it's just empty string
  window.accountId = window.walletConnection.getAccountId()

  // Initializing our contract APIs by contract name and configuration
  window.contract = await new Contract(window.walletConnection.account(), nearConfig.contractName, {
    // View methods are read only. They don't modify the state, but usually return some value.
    viewMethods: ['createTree', 'createWitness', 'getProof', 'verifyProofAndUpdate'],
    changeMethods: []
    // Change methods can modify the state. But you don't receive the returned value when called.
  })
}

export function logout() {
  window.walletConnection.signOut()
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

export function login() {
  // Allow the current app to make calls to the specified contract on the
  // user's behalf.
  // This works by creating a new access key for the user's account and storing
  // the private key in localStorage.
  window.walletConnection.requestSignIn(nearConfig.contractName)
}

export async function getProof(user, condition){
  let response = await window.contract.getProof({
    args: {
      user: user,
      condition: condition
    }, 
  });
  return response
}

export async function createWitness(user, condition) {
  let response = await window.contract.createWitness({
    args: {
      user: user,
      condition: condition
    }
  });
  return response;
}

export async function verifyProofAndUpdate(proof, name, mobile){

  let response = await window.contract.verifyProofAndUpdate({
    args: {
        proof: proof,
        mobile: mobile,
        name: name
    }
  });

  setMessage(response);
  
  return response;
}