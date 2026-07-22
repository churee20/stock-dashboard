import {
  fetchAssetClassRatioRows,
  fetchInvestmentSheetRows,
} from "@/lib/google-sheets/client"
import {
  parseAssetClassRatio,
  parseInvestmentSheet,
} from "@/lib/google-sheets/parser"
import { collectFromSheet } from "@/lib/supabase/collect"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isDryRun = searchParams.get("dryRun") === "true"

  try {
    const rawRows = await fetchInvestmentSheetRows()
    const sheetRows = parseInvestmentSheet(rawRows)

    const assetClassRawRows = await fetchAssetClassRatioRows()
    const assetClassRows = parseAssetClassRatio(assetClassRawRows)

    if (isDryRun) {
      return Response.json({
        dryRun: true,
        rawRowCount: rawRows.length,
        rawRows,
        parsedRows: sheetRows,
        parsedAssetClassRows: assetClassRows,
      })
    }

    const result = await collectFromSheet(sheetRows, assetClassRows)
    return Response.json({ success: true, ...result })
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}
