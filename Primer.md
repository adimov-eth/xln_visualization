# XLN Litepaper – A Plain-English Primer on the Extended Lightning Network

## Cover & tagline

**Tagline:** Meta Layer 2 - One Network to Bring Crypto to the Masses and Solve the Overwhelming Complexity of Navigating Hundreds of Blockchains and Their Rules and Risks.

Traditional blockchains and layer-2s have multiplied into a tangled web: dozens of chains, each with its own tokens, bridges, sequencers and risk profiles. Even the most passionate crypto user spends more time worrying about liquidity, bridge hacks and withdrawal delays than enjoying the technology. XLN (the Extended Lightning Network) proposes a **meta-layer** built across existing chains that hides this complexity and lets you pay and build as easily as sending a text.

## 1 Problem statement

Crypto is still hard to use for regular people:

- **Fragmentation:** Ethereum, Solana, Avalanche and dozens of other chains have separate wallets, tokens and bridge risks. Users must manage seed phrases, gas fees and cross-chain bridges just to move value. DeFi and NFT ecosystems are siloed, making onboarding overwhelming.
    
- **Operational centrality & censorship risk in rollups:** Popular optimistic rollups such as Optimism rely on a **single sequencer** managed by an operator ¹. Transactions sent directly to that sequencer are cheaper but **cannot be censorship resistant**, because the sequencer is the only participant that knows about them ¹. Misbehaving sequencers can censor users or delay blocks; if there is only one sequencer, censorship can be very effective ². Many rollups remain highly centralized, so a single sequencer failure can halt the entire network ³.
    
- **Exit latency:** In optimistic rollups, withdrawals back to the main chain are subject to a **challenge window**. Optimism's documentation notes that after you submit a withdrawal proof, you must wait until the fault challenge period ends—“a week on mainnet” ⁴. Only if a proposed state commitment goes unchallenged for the duration of this 7-day window is it considered final ⁴. This delay is acceptable for traders but painful for everyday payments.
    
- **User-funded channels in Lightning:** The Lightning Network requires senders and receivers to lock funds in channels. The amount a node can receive is limited by its remote balance ⁵; new merchants often have no inbound capacity ⁵. While LN is not the focus of this litepaper, it illustrates how existing L2s force users to pre-fund liquidity or wait for counterparties.
    

These limitations contribute to the perception that crypto is only for experts. To reach mainstream adoption, we need a system that unifies liquidity across chains, reduces dependence on centralized sequencers and eliminates long withdrawal delays.

---

## 2 Solution snapshot

XLN is a **meta-layer-2** protocol that integrates the benefits of payment channels and rollups while removing their pain points. Instead of one global chain or sequencer, XLN is a network of **depositaries** anchored on different blockchains. Each depositary is a smart contract that holds reserves and collateral for a specific token or jurisdiction; it publishes Merkle roots to prove solvency ⁶. Above depositaries lives the **Entity layer**—sovereign state machines run by businesses or communities. Entities manage their own rules, issue tokens, open credit lines and settle disputes via their chosen depositary. Credit-line channels allow payees to receive funds without pre-funded inbound liquidity; users set a soft and hard limit for each hub, and hubs rebalance when the soft limit is exceeded ⁷.

The result is a **topology** where multiple blockchains and jurisdictions connect through XLN depositaries into a single liquidity layer. Users can send any asset to anyone, anywhere, without worrying which chain they are on. Compliance and governance hooks live in each entity, not in a global contract.

## 3 How it works (high-level)

1. **Depositaries on each chain:** For every supported token (e.g., ETH, USDC on Ethereum; SOL; wBTC on Bitcoin), a depositary contract holds the collateral. Depositary contracts expose functions to deposit, withdraw and settle disputes. They also publish Merkle-root snapshots of their reserves so anyone can verify solvency and credit exposure ⁶.
    
2. **Entities as sovereign machines:** An entity is a programmable state machine with its own quorum (board). It can issue tokens, open accounts and credit lines, and run internal DeFi logic ⁸. Entities interact with depositaries by submitting signed receipts; the depositary does not know or control the entity's internal state ⁶.
    
3. **Credit-line channels:** Within an entity, accounts represent bilateral credit relationships. Suppose Alice wants to pay Bob but has no inbound liquidity. Bob (or a hub) can extend a **soft/hard credit limit** to Alice; Alice can receive payments up to the hard limit without pre-funding, and the hub settles with the depositary when the soft limit is exceeded ⁷. Uninsured balances are signed promises enforceable on-chain; deposit insurance ensures hubs remain solvent ⁷.
    
4. **Cross-chain transfers:** To move assets between chains, a user opens a channel with a hub connected to both depositaries. The hub uses an 8-bit hash-locked HTLC to atomically exchange tokens; each bit corresponds to a partial execution of the swap ⁹. If the swap is partially executed, the remaining bits remain locked until they expire or are redeemed. Receipts from one depositary allow claiming collateral from another, enabling atomic cross-jurisdiction swaps.
    
5. **Local finality & global anchoring:** Entities finalize blocks locally every 100 ms and commit them to their internal Merkle store. Periodically, entities publish their Merkle roots to their depositary (or directly to L1), providing **hash-checked snapshots** that other parties can verify ¹⁰. There is no single sequencer; each entity's board decides when to publish. This reduces censorship risk and ensures that failure of one entity does not affect others.
    

---

## 4 Benefits and real-world implications

|   |   |   |
|---|---|---|
|Benefit|Real-world implication|Evidence|
|**Speed & low latency**|Users enjoy sub-second confirmation for most payments because entities commit blocks every 100 ms and hubs have near-instant credit settlements. Merchants can receive payments without waiting for a 7-day challenge window.|XLN's consensus commits 100 ms frames ¹¹; Optimism's withdrawals require a week-long challenge period ⁴.|
|**Capital efficiency**|Credit-line channels free over 80 % of capital otherwise locked in full-reserve channels; hubs can operate on fractional reserves while publishing solvency proofs ¹². Merchants no longer need inbound liquidity.|Uninsured balances are 99 % secure and only up to the hard limit ⁷.|
|**Multi-asset support**|Entities can hold and trade ERC-20/721/1155 tokens and native coins. Micro-AMMs enable on-the-fly conversion; merchants accept any asset without integrating multiple blockchains. ¹³||
|**Modular compliance**|The JEA model separates jurisdiction (reserve and dispute settlement) from entities (business logic) ⁶. Compliance officers can audit Merkle proofs without accessing internal state. Entities can implement AML/ KYC modules tailored to their jurisdiction.||
|**Reduced censorship & single-point-of-failure risk**|Each entity has its own quorum; there is no single sequencer. Misbehaving sequencers in rollups can censor transactions or cause the entire rollup to fail ² ³. XLN decentralizes block production across many sovereign entities.|Optimism currently operates with a single sequencer ¹; many rollups remain centralized ³.|

## 5 Development roadmap (high-level)

1. **Foundation (Phase 1)** – Implement deterministic persistence (msgpack with structure tables), depositary contracts, single-asset credit-line channels and CLI wallets. Provide a sandbox testnet for developers.
    
2. **Core payments & governance (Phase 2)** – Deploy multi-sig proposals, fractional-reserve proofs, multi-asset ledger, basic merchant SDK and web wallet. Launch hub risk-scoring and insurance modules.
    
3. **Cross-chain & liquidity (Phase 3)** – Enable HTLC-based cross-chain swaps, micro-AMM liquidity pools, governance token issuance and dynamic fee markets. Integrate compliance hooks and cross-jurisdiction oracles.
    

---

1. **Scalability & enterprise (Phase 4)** – Add sharding, hardware-signing support, batch endpoints, zero-knowledge compression, multi-hub routing and enterprise-grade dashboards. Enhance mobile UX and integrate with existing payment networks.
    

The logical dependency chain flows from deterministic storage → channels → dispute contract → governance → multi-asset ledger → fractional-reserve proofs → cross-chain swaps → liquidity pools and compliance ¹⁴.

## 6 Frequently asked questions

**Q: How is this different from the Lightning Network?**  
XLN generalizes Lightning by allowing post-paid credit-line channels instead of fully funded channels. Receivers set soft/hard credit limits and can receive funds without inbound liquidity ⁷. Moreover, XLN supports multiple assets and cross-chain swaps, whereas LN is limited to Bitcoin or a single asset. Finally, XLN's entities have local quorums and do not rely on a global routing network; there is no single network graph to bootstrap.

**Q: How is this different from rollups (Optimism, Arbitrum)?**  
Rollups batch transactions and rely on a single sequencer for ordering; this sequencer can censor transactions and is a potential point of failure ¹ ². Withdrawals must wait through a challenge window (currently 7 days on Optimism) ⁴. XLN avoids a single sequencer by letting each entity manage its own block production and uses credit-line channels to eliminate long exit delays. Disputes are settled via depositaries anchored on L1 with instant receipts.

**Q: What happens if a hub defaults or goes offline?**  
Hubs must post collateral in depositaries and publish solvency proofs. Credit lines include soft/hard limits; if the soft limit is exceeded, the hub must rebalance or risk default. If a hub disappears, users can claim their insured balance from the depositary. Uninsured balances beyond the hard limit are signed IOUs; users can minimize exposure by setting small limits and diversifying hubs.

**Q: When mainnet?**  
XLN is currently in active development. The Phase 1 testnet (deterministic storage, single-asset channels) is targeted for launch in 2025. Subsequent phases depend on community participation and audits. Prospective builders can join the repository and contribute to the open-source implementation.

## 7 Glossary

- **Depositary:** An on-chain smart contract that holds reserves and collateral for a specific token. It records Merkle roots of entity states and settles disputes ⁶.
    
- **Entity:** A sovereign programmable state machine with its own quorum. Entities manage accounts, credit lines and tokens and interact with a depositary via signed receipts ⁸.
    
- **Credit-line channel:** A bilateral account within an entity. One party (hub) extends a soft/hard credit limit to another party; funds can be sent without pre-funding up to the hard limit ⁷.
    
- **Soft/hard limit:** The soft limit triggers rebalancing (the hub settles with the depositary) when exceeded; the hard limit is the maximum uninsured exposure a hub is willing to extend ⁷.
    
- **Challenge window:** The period during which a state commitment in an optimistic rollup can be challenged. Optimism sets this to 7 days; only after it expires can withdrawals be finalized ⁴.
    

---

## 8 Audience & tone

This litepaper is written for multiple audiences:

1. **Crypto-savvy trader** – wants to know why XLN offers better liquidity and faster settlement than LN or rollups; worries about hub risk and cross-chain fees.
    
2. **Indie hacker / developer** - cares about how to integrate XLN into a wallet or dApp, the SDKs available and the roadmap for multi-asset support.
    
3. **Journalist / analyst** - seeks a high-level story about solving fragmentation and centralization issues; looks for quotes about credit lines and cross-chain integration.
    
4. **Regulator / compliance officer** – needs clarity on legal separation (JEA model), solvency proofs and AML/KYC integration.
    

Each section of the litepaper will build on the previous one (progressive disclosure). Technical terms like "Merkleized RLP tree" will be avoided or linked to a glossary; instead we will use analogies (e.g., "depositary is like a vault at a bank; credit limit is like a credit card"). A graphic or call-out box every few hundred words will illustrate the topology and credit-line flows. Short paragraphs and bullet lists improve readability.

## 9 References

- XLN docs: adimov-eth/xln and adimov-eth/xln01 repositories (GitHub links to be included; add a QR code linking to the main repo).
    
- Homakov, E. "**XLN: Bitcoin Extended Lighting Network**" (Medium), describing inbound liquidity and credit-line channels ¹⁵.
    
- Quantstamp **Rollup Security Framework** on sequencer centralization and censorship risks ² ³.
    
- Optimism **Rollup protocol overview** on single-sequencer architecture and 7-day challenge window ¹ ⁴.
    

This document is a living draft. For the latest implementation and community discussion, visit the XLN GitHub repository. Feedback from different personas is welcome and will be incorporated into future revisions.

---

¹ ⁴ **Rollup protocol overview | Optimism Docs**  
[https://docs.optimism.io/stack/rollup/overview](https://www.google.com/url?sa=E&q=https%3A%2F%2Fdocs.optimism.io%2Fstack%2Frollup%2Foverview)

² ³ **raw.githubusercontent.com**  
[https://raw.githubusercontent.com/quantstamp/l2-security-framework/main/README.md](https://www.google.com/url?sa=E&q=https%3A%2F%2Fraw.githubusercontent.com%2Fquantstamp%2Fl2-security-framework%2Fmain%2FREADME.md)

⁵ **The Inbound Capacity Problem in the Lightning Network**  
[https://blog.muun.com/the-inbound-capacity-problem-in-the-lightning-network/](https://www.google.com/url?sa=E&q=https%3A%2F%2Fblog.muun.com%2Fthe-inbound-capacity-problem-in-the-lightning-network%2F)

⁶ ⁸ **raw.githubusercontent.com**  
[https://raw.githubusercontent.com/xlnfinance/xln/main/docs/JEA.md](https://www.google.com/url?sa=E&q=https%3A%2F%2Fraw.githubusercontent.com%2Fxlnfinance%2Fxln%2Fmain%2Fdocs%2FJEA.md)

⁷ ¹⁵ **XLN: Extended Lightning Network. TL;DR LN is prepaid (full-reserve)... | by Egor Homakov | Fairlayer | Medium**  
[https://medium.com/fairlayer/xln-extended-lightning-network-80fa7acf80f3](https://www.google.com/url?sa=E&q=https%3A%2F%2Fmedium.com%2Ffairlayer%2Fxln-extended-lightning-network-80fa7acf80f3)

---

⁹ ¹¹ **GitHub**  
[https://github.com/adimov-eth/xln01/blob/d5cfe4c0f511a8fc9844b968533bd20a77d096dd/docs/XLN-Complete-Compiled-Documentation.md](https://www.google.com/url?sa=E&q=https%3A%2F%2Fgithub.com%2Fadimov-eth%2Fxln01%2Fblob%2Fd5cfe4c0f511a8fc9844b968533bd20a77d096dd%2Fdocs%2FXLN-Complete-Compiled-Documentation.md)

¹⁰ ¹² ¹³ ¹⁴ **GitHub**  
[https://github.com/adimov-eth/xln01/blob/d5cfe4c0f511a8fc9844b968533bd20a77d096dd/docs/XLN_PRD.md](https://www.google.com/url?sa=E&q=https%3A%2F%2Fgithub.com%2Fadimov-eth%2Fxln01%2Fblob%2Fd5cfe4c0f511a8fc9844b968533bd20a77d096dd%2Fdocs%2FXLN_PRD.md)