const codes = {
  "Discard due to wrong OrderId.": "TRADE_WRONGORDERID",
  "Manual cancelation from": "TRADE_MANUALCANCEL",
  "Cancelled by request.": "TRADE_CANCELLED",
  "Risk[0] :TradingIsHalted: Trading is HALTED": "TRADE_TRADINGHALTED",
  "Manual cancelation": "TRADE_MANUALCANCEL",
  "Cannot use margin, more than outright net Account free balance is": "TRADE_INSUFFICIENTMARGIN",
  "Insufficient funds for order SELL submission. Account free balance is": "TRADE_INSUFFICIENTFUNDS",
  "Self trading prevention.": "TRADE_SELFTRADE",
  "No price data": "TRADE_NOPRICE",
  "Order limit price is out of range.": "TRADE_OUTOFRANGE",
  "is suspended for trading.": "TRADE_SYMBOLSUSPENDED",
  "quantity less than minimum allowed": "TRADE_MINQUANTITY",
  "Insufficient volume on the opposite side of the book.": "TRADE_INSUFFICIENTLIQUIDITY",
  "FOK order cannot be completely filled.": "TRADE_FOK",
  "Canceled manually by operator:": "TRADE_ADMINCANCEL",
  "Session is not connected": "TRADE_UNKNOWN",
  "quantity is not multiply of quantity increment": "TRADE_QUANTITYINCREMENT",
  "Hold balance request failed to be processed in": "TRADE_HOLDTIMEOUT",
  "Discarded manually by operator:": "TRADE_ADMINCANCEL",
  "Cancellation of IOC leftover.": "TRADE_IOC",
  "Opposite account for currency": "TRADE_ACCOUNTMISSING",
  "quantity greater than maximum allowed": "TRADE_MAXQUANTITY",
  "Unavailable destination:": "TRADE_MARKETUNAVAILABLE",
  "Bad Limit Price": "TRADE_BADPRICE",
  "Test cancel Configurator (Canceled manualy by operator:": "TRADE_ADMINCANCEL",
};

export function reasonTransformer(reason: string) {
  if (!reason) {
    return null;
  }
  for (let substring of Object.keys(codes)) {
    if (reason.includes(substring)) {
      return codes[substring];
    }
  }
  return 'TRADE_UNKNOWN';
}
