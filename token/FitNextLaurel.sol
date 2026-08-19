// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * FitNext Laurel — the FitNext reward token on Robinhood Chain (chain id 4663).
 *
 * Deliberately boring: a fixed-supply ERC-20, entire supply minted to the
 * deployer (the treasury wallet), no owner functions, no minting, no pause,
 * no fees, no upgradability. Rewards are paid by plain transfers from the
 * treasury — nothing on-chain can rug, inflate, or freeze.
 *
 * ERC20Permit (EIP-2612) is included so holders can approve by signature
 * (gasless approvals) if the app ever needs it.
 *
 * Name/symbol/supply are constructor-less constants below — edit before
 * deploying if the branding changes.
 */
contract FitNextLaurel is ERC20, ERC20Permit {
    /// 100 million tokens, 18 decimals — matches the in-app laurel economy
    /// (1 LAUREL per laurel earned leaves ~5,400 years of daily seals for
    /// 1,000 athletes; adjust before deploy if tokenomics change).
    uint256 public constant SUPPLY = 100_000_000e18;

    constructor() ERC20("FitNext Laurel", "LAUREL") ERC20Permit("FitNext Laurel") {
        _mint(msg.sender, SUPPLY);
    }
}
