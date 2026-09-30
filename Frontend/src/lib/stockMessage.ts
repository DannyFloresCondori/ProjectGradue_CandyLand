interface StockReturnDetail {
  productName: string
  quantity: number
}

export function formatStockReturnMessage(details: StockReturnDetail[]): string {
  const returnedItems = details
    .filter((detail) => detail.quantity > 0)
    .map((detail) => `${detail.quantity} ${detail.productName}`)

  if (returnedItems.length === 0) return 'Stock restituido.'

  return `Se devolvieron ${returnedItems.join(', ')} al stock.`
}