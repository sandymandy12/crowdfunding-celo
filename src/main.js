import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import erc20Abi from "../contract/erc20.abi.json"
import crowdfundingAbi from "../contract/crowdfunding.abi.json"

const ERC20_DECIMALS = 18
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"
const cfContractAddress = '0xEb0A9112722BC911756cb8a477d2358CaE946D11';

let kit
let contract
let projects = []

const connectCeloWallet = async function () {
    console.log("connecting celo")
  if (window.celo) {
    try {
      notification("⚠️ Please approve this DApp to use it.")
      const celo = await window.celo.enable()
      console.log('celo', celo);
      notificationOff()
      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0];

      contract = new kit.web3.eth.Contract(crowdfundingAbi, cfContractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
  }
}

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(cfContractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}

const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  console.log('balance', cUSDBalance)
  document.getElementById('balance').innerHTML = cUSDBalance;
  return cUSDBalance;
}

document
  .querySelector("#newProjectBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newProjectName").value,
      document.getElementById("newDescription").value,
      new BigNumber(document.getElementById("newGoal").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString()
    ]

    notification(`⌛ Adding "${params[0]}"...`)
    try {
        const result = await contract.methods
          .addProject(...params)
          .send({ from: kit.defaultAccount })
        console.log('launch result',result);
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
      notification(`🎉 You successfully added "${params[0]}".`)
      getProjects()
  })

// Support 
document.querySelector("#projectList").addEventListener("click", async (e) => {
  if (e.target.className.includes('supportBtn')) {
    const index = e.target.id;
    
    const amount = new BigNumber(document.getElementById("supportAmount").value)
    .shiftedBy(ERC20_DECIMALS)
    .toString()
    
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(amount);
    } catch (error) {
      notification(`⚠️ ${error}.`)
      console.log(error);
    }
    
    notification(`⌛ Awaiting payment for "${projects[index].name}"...`)

    try {
      const result = await contract.methods
        .supportProject(index)
        .send({  value: amount, from: kit.defaultAccount });

      console.log('Support Result:',result);

      notification(`🎉 You successfully supported "${projects[index].name}".`)

      getProjects()
      getBalance()

    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
  }
})

// Suggestions
document.querySelector("#projectList").addEventListener("click", async (e) => {
  if (e.target.className.includes('suggestBtn')) {
    const index = e.target.id;
    
    const suggestion = document.getElementById("suggestionId").value
    
    const confirmed = alert('Are you sure?', suggestion);
    console.log('confirmation', confirmed);

    notification(`⌛ Sending feedback to "${projects[index].name}"...`)

    if (confirmed) {
      try {
        const result = await contract.methods
          .suggest(index, suggestion)
          .send({ from: kit.defaultAccount });
        console.log('Suggestion Result:',result);
        notification(`🎉 You successfully supported "${projects[index].name}".`)
        getProjects()
        getBalance()
      } catch (error) {
          notification(`⚠️ ${error}.`)
      }
    }
    
  }
})

const getProjects = async function() {
  const _projectsLength = await contract.methods.totalProjects().call()
  const _projects = []
  
  console.log("Projects: " + _projectsLength)
  for (let i = 0; i < _projectsLength; i++) {

    let _project = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readProject(i).call()
      
      const _suggestions = [];
      for (let j = 0; j < p[6]; i++) {
        let _suggestion = new Promise(async (resolve, reject) => {
          let s = await contract.methods.getSuggestions(_project.id,i).call()
          resolve({
            index: i,
            sender: s[0],
            suggestion: s[1],
            time: s[2],
          })
        })
        _suggestions.push(_suggestion);
      }

      resolve({
        index: i,
        creator: p[0],
        name: p[1],
        description: p[2],
        supporters: p[3],
        goal: new BigNumber(p[4]),
        invested: p[5],
        suggestions: _suggestions
      })
    })
    _projects.push(_project)
  }

  projects = await Promise.all(_projects)
  renderProjects()
}

function renderProjects() {
  document.getElementById("projectList").innerHTML = "";
  projects.forEach((_project) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = projectTemplate(_project);
    
    document.getElementById("projectList").appendChild(newDiv)
  })
}

function notification(_text) {
  console.log(_text);
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}

function projectTemplate(_project) {
  let progress = (_project.invested / _project.goal) * 100
  
  return `
    <div class="card mb-4" >
      <div class="card-body text-left  position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_project.creator)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_project.name}</h2>
        <p class="card-text " style="">
          Goal <b>${_project.goal.shiftedBy(-ERC20_DECIMALS).toFixed(4)}</b> cUSD  [${progress}% achieved]        
        </p>
        <progress  class="a-progress-bar a-progress-bar--green" value="${progress.toFixed(2)}" max="100"></progress>
        <p class="card-text mb-4" >
          ${_project.description}
        </p>
        <p class="card-text mb-4" >
          ${_project.supporters} Supporters ⚓️
        </p>
        <a class="btn btn-lg btn-outline-dark bg-success fs-6 p-3" id=${
          _project.index
        }
          
          data-bs-toggle="modal"
          data-bs-target="#supportModal"
        >
          <b>Support</b> ${_project.name} 
        </a>

        <a class="btn btn-sm btn-outline-dark bg-primary fs-6 p-3" id=${
          _project.index
        }
          
          data-bs-toggle="modal"
          data-bs-target="#suggestModal"
        >
          <b>Feedback?</b>
        </a>

        <!--Modal-->
        ${supportModal(_project.index)}
        <!--/Modal-->

        <!--Modal-->
        ${suggestModal(_project.index)}
        <!--/Modal-->

        <div class="d-grid gap-1">
          ${suggestionTemplate(_project)}
        </div>
      </div>
    </div>
  `
}

function supportModal(_index) {
  return`
    <div
      class="modal fade"
      id="supportModal"
      tabindex="-1"
      aria-labelledby="supportModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title" id="supportModalLabel">Support</h5>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-row">
                <div class="col">
                  <input
                    type="text"
                    id="supportAmount"
                    class="form-control mb-2 "
                    placeholder="Support in cUSD"
                  />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-light border"
              data-bs-dismiss="modal"
            >
              Close
            </button>
            <button
              type="button"
              class="btn btn-dark supportBtn"
              data-bs-dismiss="modal"
              id="${_index}"
            >
              Thanks, Lets go! 🚀
            </button>
          </div>
        </div>
      </div>  
    </div>     
  `
}

function suggestModal(_index) {
  return`
    <div
      class="modal fade"
      id="suggestModal"
      tabindex="-1"
      aria-labelledby="suggestModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title" id="suggestModalLabel">Support</h5>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-row">
                <div class="col">
                  <input
                    type="text"
                    id="suggestionId"
                    class="form-control mb-2 "
                    placeholder="Leave great feedback!"
                  />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-light border"
              data-bs-dismiss="modal"
            >
              Close
            </button>
            <button
              type="button"
              class="btn btn-dark suggestBtn"
              data-bs-dismiss="modal"
              id="${_index}"
            >
              Thanks, Lets go! 🚀
            </button>
          </div>
        </div>
      </div>  
    </div>     
  `
}

function suggestionTemplate(_project) { 
  return`
  <div class="container" style="
    max-width: 640px;
    margin: 30px auto;
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  >  
    <div class="row">
      <div class="">
        <div class="suggestion">
          ${_project.suggestions.map((s) => {
            let t = new Date();
            t = t.setTime(s.time);
            t.toda
            return(
              `<h2><i>${s.sender}</i><h2>
              <p>${s.suggestion}</p>
              <p>${t.toLocaleTimeString}</p>`
            )
          })}
        </div><!--End Comment-->
      </div><!--End col -->
    </div><!-- End row -->
    
  </div><!--End Container -->
  `
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

window.addEventListener('load', async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await getProjects()
  notificationOff()
});