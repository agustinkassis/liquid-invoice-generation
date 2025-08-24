import { randomBytes, createHash } from "crypto"
import { BIP32Factory } from "bip32"
import * as ecc from "tiny-secp256k1"

const bip32 = BIP32Factory(ecc)

export interface BoltzReverseSwapResponse {
  id: string
  invoice: string
}

export async function createBoltzReverseSwap(amountMsat: number): Promise<BoltzReverseSwapResponse> {
  const sats = Math.floor(amountMsat / 1000)
  if (sats <= 0) throw new Error("amountMsat too small; needs >= 1000")

  const preimage = randomBytes(32)
  const preimageHash = createHash("sha256").update(preimage).digest("hex")
  const claimKey = bip32.fromSeed(randomBytes(32))

  const res = await fetch("https://api.boltz.exchange/v2/swap/reverse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      invoiceAmount: sats,
      to: "L-BTC",
      from: "BTC",
      claimPublicKey: claimKey.publicKey.toString("hex"),
      preimageHash,
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Boltz reverse swap failed: ${res.status} ${txt}`)
  }

  return (await res.json()) as BoltzReverseSwapResponse
}
