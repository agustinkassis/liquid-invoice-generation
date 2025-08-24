"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Loader2, Zap } from "lucide-react"

interface SwapResponse {
  ok: boolean
  swapId: string
  lightningInvoice: string
  destinationLiquidAddress: string
  amountMsat: number
  amountSats: number
  error?: string
}

export default function BoltzInvoiceGenerator() {
  const [amountMsat, setAmountMsat] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SwapResponse | null>(null)
  const [error, setError] = useState("")

  const generateInvoice = async () => {
    if (!amountMsat || isNaN(Number(amountMsat))) {
      setError("Please enter a valid amount in millisats")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch(`/api/boltz/reverse?amountMsat=${amountMsat}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate invoice")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">Liquid Invoice Generator</h1>
          </div>
          <p className="text-gray-600">Generate Lightning invoices for Liquid Bitcoin atomic swaps via Boltz</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Lightning Invoice</CardTitle>
            <CardDescription>
              Enter an amount in millisats to generate a Lightning invoice that swaps to Liquid Bitcoin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (millisats)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 100000 (100 sats)"
                value={amountMsat}
                onChange={(e) => setAmountMsat(e.target.value)}
                min="1000"
                step="1000"
              />
              <p className="text-sm text-gray-500">
                Minimum: 1,000 millisats (1 sat). Example: 100,000 millisats = 100 sats
              </p>
            </div>

            <Button onClick={generateInvoice} disabled={loading || !amountMsat} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Invoice...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Lightning Invoice
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Invoice Generated Successfully!</CardTitle>
              <CardDescription>
                Swap ID: {result.swapId} • Amount: {result.amountSats} sats ({result.amountMsat} millisats)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Input value={result.lightningInvoice} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.lightningInvoice)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destination Liquid Address</Label>
                <div className="flex gap-2">
                  <Input value={result.destinationLiquidAddress} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(result.destinationLiquidAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Pay the Lightning invoice above to receive L-BTC at the generated Liquid address. The atomic swap will
                  be handled automatically by Boltz.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>1. Enter the amount you want to receive in Liquid Bitcoin (in millisats)</p>
            <p>2. A new Liquid address is derived from your watch-only descriptor</p>
            <p>3. A reverse atomic swap is created with Boltz (Lightning → Liquid)</p>
            <p>4. Pay the generated Lightning invoice to receive L-BTC at the Liquid address</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
