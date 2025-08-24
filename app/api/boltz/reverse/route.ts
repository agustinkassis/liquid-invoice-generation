import { type NextRequest, NextResponse } from "next/server"
import { parseLiquidDescriptors, deriveLiquidAddress, getNextExternalIndex } from "@/lib/liquid-descriptors"
import { createBoltzReverseSwap } from "@/lib/boltz-api"

export async function GET(req: NextRequest) {
  try {
    console.log("[v0] Starting Boltz reverse swap request")

    const url = new URL(req.url)
    const amountStr = url.searchParams.get("amountMsat")
    console.log("[v0] Received amountMsat parameter:", amountStr)

    if (!amountStr) {
      console.log("[v0] Missing amountMsat parameter")
      return NextResponse.json({ error: "amountMsat query param required" }, { status: 400 })
    }

    const amountMsat = Number(amountStr)
    console.log("[v0] Parsed amountMsat:", amountMsat)

    if (!Number.isFinite(amountMsat) || amountMsat <= 0) {
      console.log("[v0] Invalid amountMsat value:", amountMsat)
      return NextResponse.json({ error: "Invalid amountMsat - must be a positive number" }, { status: 400 })
    }

    if (!process.env.LIQUID_DESCRIPTORS) {
      console.log("[v0] Missing LIQUID_DESCRIPTORS environment variable")
      return NextResponse.json({ error: "Server configuration error: LIQUID_DESCRIPTORS not set" }, { status: 500 })
    }

    console.log("[v0] Parsing Liquid descriptors from environment")
    const parsed = parseLiquidDescriptors(process.env.LIQUID_DESCRIPTORS)
    console.log("[v0] Parsed descriptors successfully:", {
      hasExternalXpub: !!parsed.externalXpub,
      hasMasterBlindingKey: !!parsed.masterBlindingKeyHex,
    })

    const index = getNextExternalIndex()
    console.log("[v0] Using external index:", index)

    const derived = deriveLiquidAddress(parsed.externalXpub, index, parsed.masterBlindingKeyHex)
    console.log("[v0] Derived Liquid address:", {
      confidential: derived.confidential,
      unconfidential: derived.unconfidential,
    })

    console.log("[v0] Creating Boltz reverse swap for amount:", amountMsat)
    const created = await createBoltzReverseSwap(amountMsat)
    console.log("[v0] Boltz swap created successfully:", { id: created.id, hasInvoice: !!created.invoice })

    const response = {
      ok: true,
      swapId: created.id,
      lightningInvoice: created.invoice,
      destinationLiquidAddress: derived.confidential,
      amountMsat,
      amountSats: Math.floor(amountMsat / 1000),
    }

    console.log("[v0] Returning successful response:", { swapId: response.swapId, amountSats: response.amountSats })
    return NextResponse.json(response)
  } catch (e: any) {
    console.error("[v0] Boltz reverse swap error details:", {
      message: e?.message,
      stack: e?.stack,
      name: e?.name,
      cause: e?.cause,
    })

    // Ensure we always return a valid JSON response
    const errorMessage = e?.message || "Unknown error occurred"
    const errorResponse = {
      error: errorMessage,
      ok: false,
      timestamp: new Date().toISOString(),
    }

    console.log("[v0] Returning error response:", errorResponse)
    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}
