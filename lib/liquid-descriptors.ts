import { networks, payments, address as liqAddress } from "liquidjs-lib"
import { BIP32Factory, type BIP32Interface } from "bip32"
import * as ecc from "tiny-secp256k1"
import Slip77 from "slip77"

const bip32 = BIP32Factory(ecc)

// --- Parser for descriptor env lines ---
export type ParsedDescriptors = {
  masterBlindingKeyHex: string
  externalXpub: string
  internalXpub: string
}

const DESCR_RE =
  /ct$$slip77\(([0-9a-fA-F]{64})$$,\s*elsh$$wpkh\(\[[^\]]+\](xpub[1-9A-HJ-NP-Za-km-z]+)\/([01])\/\*$$\)\)#[a-z0-9]+/g

export function parseLiquidDescriptors(envStr: string): ParsedDescriptors {
  if (!envStr) throw new Error("LIQUID_DESCRIPTORS env is empty")
  const lines = envStr
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length !== 2) throw new Error("LIQUID_DESCRIPTORS must have 2 lines")

  let master: string | undefined, ext: string | undefined, intl: string | undefined
  for (const line of lines) {
    const m = [...line.matchAll(DESCR_RE)][0]
    if (!m) throw new Error(`Descriptor not recognized: "${line}"`)
    const [_, slip77hex, xpub, branchStr] = m
    if (!master) master = slip77hex
    else if (master !== slip77hex) throw new Error("Both descriptors must share same SLIP-77 key")
    if (branchStr === "0") ext = xpub
    else if (branchStr === "1") intl = xpub
  }
  if (!ext || !intl) throw new Error("Missing external (branch 0) or internal (branch 1) xpub")
  return { masterBlindingKeyHex: master!, externalXpub: ext!, internalXpub: intl! }
}

// Liquid network config
const LQ_NETWORK = (networks as any).liquid ?? networks.bitcoin

// Temporary in-memory index
let inMemoryExternalIndex = 0

export function deriveLiquidAddress(xpub: string, index: number, masterBlindingKeyHex: string) {
  const node: BIP32Interface = bip32.fromBase58(xpub, LQ_NETWORK)
  const child = node.derive(0).derive(index)
  const pay = payments.p2wpkh({ pubkey: child.publicKey, network: LQ_NETWORK })
  if (!pay.address || !pay.output) throw new Error("Failed to derive Liquid address")
  const slip77 = Slip77.fromMasterBlindingKey(Buffer.from(masterBlindingKeyHex, "hex"))
  const { publicKey: blindingPubKey } = slip77.derive(pay.output)
  return {
    base: pay.address,
    confidential: liqAddress.toConfidential(pay.address, blindingPubKey),
    scriptPubKey: pay.output,
  }
}

export function getNextExternalIndex(): number {
  return inMemoryExternalIndex++
}
