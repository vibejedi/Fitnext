# FitNext Laurel (LAUREL) — deployment guide

Fixed-supply ERC-20 on **Robinhood Chain** (owner decision 2026-08-19).
Contract: [`FitNextLaurel.sol`](./FitNextLaurel.sol) — no minting, no owner
functions, whole supply to the deployer. Edit name/symbol/`SUPPLY` in the
contract **before** deploying if branding or tokenomics change.

## Network parameters

|            | Mainnet | Testnet |
|------------|---------|---------|
| Chain ID   | `4663`  | `46630` |
| RPC        | `https://rpc.mainnet.chain.robinhood.com` | `https://rpc.testnet.chain.robinhood.com` |
| Explorer   | https://robinhoodchain.blockscout.com | https://explorer.testnet.chain.robinhood.com |
| Gas token  | ETH | ETH |

(Also in `src/lib/chain.ts`, which the app reads.) Docs: https://docs.robinhood.com/chain/connecting

## Order of operations

1. **Create the treasury wallet.** A fresh self-custody wallet (MetaMask is
   fine). This address will hold the whole supply and send all payouts —
   back up the seed phrase offline. Add Robinhood Chain to the wallet with
   the parameters above.
2. **Fund it with ETH for gas.** From the Robinhood app/account, move ETH to
   Robinhood Chain (native path), or bridge via LayerZero:
   https://docs.robinhood.com/chain/bridging. Deployment + thousands of
   transfers costs very little on an L2 — 0.005 ETH is plenty to start.
3. **Dry-run on testnet first.** Deploy to chain `46630`, send yourself a
   test payout, check it on the testnet explorer. Then repeat on mainnet.

## Deploy — Remix (no tooling needed)

1. Open https://remix.ethereum.org, create `FitNextLaurel.sol`, paste the
   contract. Remix resolves the OpenZeppelin imports automatically.
2. Compile with Solidity `0.8.24+`.
3. In *Deploy & Run*: Environment → **Injected Provider** (MetaMask on
   Robinhood Chain), then **Deploy** from the treasury wallet.
4. Copy the deployed contract address.

## Deploy — Foundry (if you prefer the CLI)

```bash
forge init fitnext-token && cd fitnext-token
forge install OpenZeppelin/openzeppelin-contracts
cp ../token/FitNextLaurel.sol src/
forge create src/FitNextLaurel.sol:FitNextLaurel \
  --rpc-url https://rpc.mainnet.chain.robinhood.com \
  --private-key $TREASURY_KEY
```

## After deploying

- **Verify the source** on Blockscout (Contract → Verify & Publish, or
  `forge verify-contract --verifier blockscout`). Verified source is what
  makes the token look legitimate to anyone who checks.
- **Record the contract address** — add it to `src/lib/chain.ts` as
  `LAUREL_TOKEN_ADDRESS` so the app can link to it.
- **Payouts:** `node scripts/export-payouts.mjs` exports every enrolled
  athlete's wallet + laurels from Supabase as CSV/JSON for batch transfers.

## Cautions

- The treasury seed phrase is the whole token. Cold-store it.
- Test one small real payout end-to-end before any announced season payout.
- Framing matters legally: "rewards for training effort", never investment
  language. Re-check the sub-discount-for-holders idea with counsel before
  shipping it.
