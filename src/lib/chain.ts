/**
 * Solana — the network FitNext rewards live on (owner decision 2026-08-24,
 * superseding the earlier Robinhood Chain pick). Matches the rest of the
 * stack: sign-in supports Solana wallets via Privy, and the tribute/Vault
 * roadmap is Solana + USDC. The public RPC is rate-limited; use a managed
 * provider for anything heavier than a wallet.
 */

export interface ChainInfo {
  /** Cluster identifier (Solana has no EVM-style numeric chain id). */
  cluster: "mainnet-beta" | "devnet";
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  currency: { name: string; symbol: string; decimals: number };
}

export const SOLANA_MAINNET: ChainInfo = {
  cluster: "mainnet-beta",
  name: "Solana",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  explorerUrl: "https://solscan.io",
  currency: { name: "Solana", symbol: "SOL", decimals: 9 },
};

export const SOLANA_DEVNET: ChainInfo = {
  cluster: "devnet",
  name: "Solana Devnet",
  rpcUrl: "https://api.devnet.solana.com",
  explorerUrl: "https://solscan.io", // append ?cluster=devnet to links
  currency: { name: "Solana", symbol: "SOL", decimals: 9 },
};

/** The chain rewards are paid on. */
export const REWARDS_CHAIN = SOLANA_MAINNET;

/** Solana address: base58 (no 0/O/I/l), 32-44 chars. */
export const SOL_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** A legacy Ethereum-era reward address (pre-Solana migration). */
export const isLegacyEthAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);

/** Explorer link for an address on the rewards chain. */
export const explorerAddressUrl = (address: string) =>
  `${REWARDS_CHAIN.explorerUrl}/account/${address}${
    REWARDS_CHAIN.cluster === "devnet" ? "?cluster=devnet" : ""
  }`;
