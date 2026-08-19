/**
 * Robinhood Chain — the network FitNext rewards live on (owner decision
 * 2026-08-19). An Ethereum L2 (Arbitrum Nitro stack) with ETH gas, so all
 * existing 0x address handling applies unchanged. Params from
 * https://docs.robinhood.com/chain/connecting — the public RPC is
 * rate-limited; use a managed provider for anything heavier than a wallet.
 */

export interface ChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  wsUrl: string;
  explorerUrl: string;
  currency: { name: string; symbol: string; decimals: number };
}

export const ROBINHOOD_CHAIN: ChainInfo = {
  chainId: 4663,
  name: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  wsUrl: "wss://feed.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  currency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

export const ROBINHOOD_CHAIN_TESTNET: ChainInfo = {
  chainId: 46630,
  name: "Robinhood Chain Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  wsUrl: "wss://feed.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  currency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

/** The chain rewards are paid on. */
export const REWARDS_CHAIN = ROBINHOOD_CHAIN;

/** Explorer link for an address on the rewards chain. */
export const explorerAddressUrl = (address: string) =>
  `${REWARDS_CHAIN.explorerUrl}/address/${address}`;

/** EIP-3085 params for wallet_addEthereumChain — lets a wallet add the
 *  network in one prompt. */
export const addChainParams = (c: ChainInfo = REWARDS_CHAIN) => ({
  chainId: `0x${c.chainId.toString(16)}`,
  chainName: c.name,
  nativeCurrency: c.currency,
  rpcUrls: [c.rpcUrl],
  blockExplorerUrls: [c.explorerUrl],
});
