---
name: research-signal
description: Quant-researcher playbook for turning a research question into a backtested, confidence-scored signal or strategy. Scope the hypothesis, pipeline data, backtest with rigor (fees/slippage/latency, check for overfitting/look-ahead/survivorship bias), size from evidence, ship or kill. Use for signal research, backtesting, or sizing/risk-parameter work.
---

# Research a trading signal

Turn market data into a tested, honestly-scored signal — and ship it into monitored code, or
kill it and say why. Use this for any research task from `head-of-trading`.

## Read first
- The task brief (research question, target markets, deliverable)
- `departments/front-office/CLAUDE.md` — venues, instruments, data sources in scope
- Prior research/backtests referenced in the brief

## Procedure
1. **Scope the question.** What hypothesis, over what universe and timeframe?
2. **Pipeline the data.** Historical/live market, funding, on-chain feeds as needed — cite sources and known gaps.
3. **Backtest with rigor.** Realistic fees/slippage/latency. Actively check for and disclose overfitting, look-ahead bias, survivorship bias.
4. **Size from evidence.** Position sizing and risk parameters trace to a specific test result.
5. **Ship or kill.** If it holds up, translate into strategy code with live-vs-backtest drift monitoring. If not, say so plainly.

## Output shape
```
**Hypothesis:** [what was tested]
**Result:** [key metric, e.g. Sharpe, over what sample]
**Confidence:** [high/medium/low + why — biases checked, regimes covered]
**Recommendation:** [ship / kill / needs more data]
```

## Guardrails
- State confidence level and known biases explicitly in every output.
- Don't recommend a position size or risk parameter you can't trace to a test result.
- No live deployment without head-of-trading's approval.
