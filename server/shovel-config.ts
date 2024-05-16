import { makeConfig, toJSON } from '@indexsupply/shovel-config'
import type { Source, Table, Integration } from '@indexsupply/shovel-config'
import {
  Problems,
  Bodies,
  Solver,
  Dust,
  ProblemMetadata,
  BodyMetadata
} from './contracts'
import { ethers } from 'ethers'

const mainnet: Source = {
  name: 'mainnet',
  chain_id: 1,
  url: 'https://ethereum-rpc.publicnode.com'
}

const sepolia: Source = {
  name: 'sepolia',
  chain_id: 11155111,
  url: 'https://ethereum-sepolia-rpc.publicnode.com',
  batch_size: 10,
  concurrency: 2
}

const network = sepolia.chain_id
const contracts = Object.fromEntries(
  [Problems, Bodies, Solver, Dust, ProblemMetadata, BodyMetadata].map(
    (contract) => {
      const abi = contract.abi.abi
      return [
        contract.abi.contractName,
        new ethers.Contract(contract.networks[network].address, abi)
      ]
    }
  )
)

const solTypeToPgType = {
  address: 'bytea',
  uint256: 'numeric'
}

async function integrationFor(
  contractName: string,
  eventName: string,
  tableName: string
): Promise<Integration> {
  const contract = contracts[contractName]
  const event = contract.interface.getEvent(eventName)
  const columns = event.inputs
    .map((input) => {
      return {
        name: input.name,
        type: solTypeToPgType[input.type],
        indexed: input.indexed
      }
    })
    .concat([
      { name: 'tx_hash', type: 'bytea', indexed: false },
      {
        name: 'log_addr',
        type: 'bytea',
        indexed: true
      }
    ])
  const table: Table = {
    name: tableName,
    columns
  }

  const inputs = event.inputs.map((input) => {
    return {
      name: input.name,
      type: input.type,
      indexed: input.indexed,
      column: input.name
    }
  })

  return {
    enabled: true,
    name: 'solver',
    sources: [{ name: sepolia.name, start: 0n }],
    table,
    block: [
      {
        name: 'log_addr',
        column: 'log_addr',
        filter_op: 'contains',
        filter_arg: [(await contract.getAddress()) as any]
      },
      { name: 'tx_hash', column: 'tx_hash' }
    ],
    event: {
      type: 'event',
      name: eventName,
      inputs
    }
  }
}

;(async () => {
  let integrations = [await integrationFor('Solver', 'Solved', 'solved')]

  const config = makeConfig({
    pg_url: 'postgres:///shovel',
    sources: [sepolia],
    integrations: integrations
  })

  console.log(toJSON(config))
})()
