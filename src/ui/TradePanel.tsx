import { useGameStore } from "./store";
import { RESOURCE_ORDER, RESOURCES } from "../engine/economy/resources";
import { TRADE_PRICES, TRADE_BATCH } from "../engine/economy/trade";

export function TradePanel() {
  const trade = useGameStore((s) => s.trade);
  const stock = useGameStore((s) => s.stock);
  const coins = useGameStore((s) => s.coins);

  return (
    <div className="trade">
      <div className="trade-head">
        <span>Merchant prices</span>
        <span className="trade-coins">🪙 {coins}</span>
      </div>
      <div className="trade-rows">
        {RESOURCE_ORDER.map((id) => {
          const p = TRADE_PRICES[id];
          const have = Math.floor(stock[id]);
          return (
            <div className="trade-row" key={id}>
              <img className="t-icon" src={`/assets/ui/${id}.png`} alt={RESOURCES[id].name} />
              <span className="t-have">{have}</span>
              <button
                className="t-sell"
                disabled={have < TRADE_BATCH}
                onClick={() => trade(id, "sell")}
                title={`Sell ${TRADE_BATCH} for ${p.sell * TRADE_BATCH} coins`}
              >
                Sell +{p.sell * TRADE_BATCH}
              </button>
              <button
                className="t-buy"
                disabled={coins < p.buy * TRADE_BATCH}
                onClick={() => trade(id, "buy")}
                title={`Buy ${TRADE_BATCH} for ${p.buy * TRADE_BATCH} coins`}
              >
                Buy −{p.buy * TRADE_BATCH}
              </button>
            </div>
          );
        })}
      </div>
      <div className="trade-foot">Trades in batches of {TRADE_BATCH}.</div>
    </div>
  );
}
