import { initContract, login, logout, getProof, verifyProofAndUpdate, createWitness, uploadData } from './near/utils'

// On submit, get the greeting and send it to the contract
document.querySelector('form').onsubmit = async (event) => {
  event.preventDefault()

  // get elements from the form using their id attribute
  const { fieldset, name, age, phn_num, ann_inc, cibil } = event.target.elements;

  console.log(name.value);

  // disable the form while the value gets updated on-chain
  fieldset.disabled = true

  //[18, 500, 760], [18, 400, 750]
  try {
    await getProof([age.value, ann_inc.value, cibil.value], [18, 600000, 750]).then(async (proof) => {
        await verifyProofAndUpdate(proof, name.value, phn_num.value).then((response) => {
            console.log(response);

            const msg = document.getElementById('msg');
            msg.innerHTML = '<div>Name: '+response[0]+"\n"+'Phone: ' + response[1] + "\nEligible? " + response[2]+'</div> <button class="link" style="float: right" id="upload"> Store </button>';
            document.getElementById('upload').addEventListener("click", async () => {
              await uploadData(response[0], response[1], response[2]).then(console.log);
            })
        });
    });
  } catch (e) {
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  }

  // re-enable the form, whether the call succeeded or failed
  fieldset.disabled = false

  // update the greeting in the UI
  //await fetchGreeting()
}

document.querySelector('#sign-in-button').onclick = login
document.querySelector('#sign-out-button').onclick = logout

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
                        .then(flow)
                        .catch(console.error)

function flow(){
  if (window.walletConnection.isSignedIn()){
    signedInFlow()
  }else{
    signedOutFlow()
  }
  //fetchGreeting()
}

export async function setMessage(msg) {
    document.getElementById('msg').innerText = msg;
}

// Display the signed-out-flow container
function signedOutFlow() {
  document.querySelector('#signed-out-flow').style.display = 'block'
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  document.querySelector('#signed-in-flow').style.display = 'block'

  document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
    el.innerText = "ZkLoan Eligibility"
  })
}