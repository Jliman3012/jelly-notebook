"""Utility helpers for working with Solana meme-coin data sources.

This module provides small client abstractions for the public BirdEye and
Bitquery APIs that were highlighted in the "Solana Meme-Coin Data – API
Overview and Usage Guide (2025)" report.  The goal of the script is to offer
ready-to-use examples for fetching trending tokens, enumerating meme tokens,
inspecting a token in detail, subscribing to new listings, and retrieving
historical trades through Bitquery's GraphQL interface.

The module can be executed directly.  When run it will:

* load API keys from environment variables (``BIRDEYE_API_KEY`` and
  ``BITQUERY_API_KEY``).
* fetch and display trending tokens from BirdEye.
* fetch the meme token catalogue and inspect the first meme token in detail.
* query Bitquery for the latest token launches and a token's recent trade
  history.

The WebSocket subscription example is implemented as a helper method but is
left disabled by default to keep the script from running indefinitely.  You can
uncomment the invocation in ``main`` to stream real-time listings.

The file purposefully keeps the dependencies lightweight (``requests``,
``websocket-client`` and ``python-dotenv``) to mirror the accompanying report.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Optional

import requests
from dotenv import load_dotenv

try:
    from websocket import WebSocketApp
except ImportError:  # pragma: no cover - dependency is optional at runtime
    WebSocketApp = None


LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


class BirdEyeError(RuntimeError):
    """Raised when BirdEye returns an error payload."""


@dataclass
class BirdEyeClient:
    """Simple wrapper around the BirdEye REST and WebSocket APIs."""

    api_key: str
    chain: str = "solana"

    BASE_URL: str = "https://public-api.birdeye.so"
    WS_URL: str = "wss://public-api.birdeye.so/socket/solana"

    def __post_init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "accept": "application/json",
                "x-api-key": self.api_key,
                "x-chain": self.chain,
            }
        )

    # ------------------------------------------------------------------
    # REST helpers
    # ------------------------------------------------------------------
    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.BASE_URL}{path}"
        response = self.session.get(url, params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, dict) and payload.get("success") is False:
            raise BirdEyeError(payload.get("message", "Unknown BirdEye error"))
        return payload.get("data", payload)

    def get_trending_tokens(
        self,
        *,
        sort_by: str = "rank",
        sort_type: str = "asc",
        offset: int = 0,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Return the BirdEye trending token list."""

        params = {
            "sort_by": sort_by,
            "sort_type": sort_type,
            "offset": offset,
            "limit": limit,
        }
        LOGGER.debug("Fetching trending tokens with params %s", params)
        return list(self._get("/defi/token_trending", params=params) or [])

    def get_meme_token_list(self, *, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Return the catalogue of meme tokens tracked by BirdEye."""

        params = {"offset": offset, "limit": limit}
        LOGGER.debug("Fetching meme token list with params %s", params)
        return list(self._get("/defi/v3/token/meme/list", params=params) or [])

    def get_meme_token_detail(self, token_address: str) -> Dict[str, Any]:
        """Return detailed statistics for a specific meme token."""

        params = {"address": token_address}
        LOGGER.debug("Fetching meme token detail for %s", token_address)
        return dict(self._get("/defi/v3/token/meme/detail/single", params=params) or {})

    # ------------------------------------------------------------------
    # WebSocket helper
    # ------------------------------------------------------------------
    def subscribe_new_listings(
        self,
        on_listing: Callable[[Dict[str, Any]], None],
        *,
        meme_only: bool = True,
        min_liquidity: Optional[float] = None,
        max_liquidity: Optional[float] = None,
    ) -> None:
        """Subscribe to the BirdEye new listing stream.

        Parameters
        ----------
        on_listing:
            Callable executed for every new listing payload received.
        meme_only:
            When ``True`` the subscription filters to meme token platforms
            (``pump.fun``, ``moonshot`` and others).  Set to ``False`` for the
            full firehose.
        min_liquidity / max_liquidity:
            Optional USD liquidity bounds applied to the subscription.
        """

        if WebSocketApp is None:  # pragma: no cover - dependency optional
            raise RuntimeError(
                "websocket-client is required for WebSocket subscriptions."
            )

        def _on_message(_: WebSocketApp, message: str) -> None:
            LOGGER.debug("Received raw listing payload: %s", message)
            try:
                payload = json.loads(message)
            except json.JSONDecodeError:
                LOGGER.warning("Unable to decode WebSocket message: %s", message)
                return
            data = payload.get("data") or payload
            if isinstance(data, dict):
                on_listing(data)

        def _on_error(_: WebSocketApp, error: Any) -> None:
            LOGGER.error("BirdEye WebSocket error: %s", error)

        def _on_close(_: WebSocketApp, close_status_code: Any, close_msg: str) -> None:
            LOGGER.info(
                "BirdEye WebSocket closed (code=%s, message=%s)",
                close_status_code,
                close_msg,
            )

        request_payload: Dict[str, Any] = {
            "type": "SUBSCRIBE_TOKEN_NEW_LISTING",
            "meme_platform_enabled": meme_only,
        }
        if min_liquidity is not None:
            request_payload["liquidity_min"] = min_liquidity
        if max_liquidity is not None:
            request_payload["liquidity_max"] = max_liquidity

        LOGGER.info("Connecting to BirdEye WebSocket for new listings…")
        ws_app = WebSocketApp(
            self.WS_URL,
            header={"x-api-key": self.api_key, "x-chain": self.chain},
            on_message=_on_message,
            on_error=_on_error,
            on_close=_on_close,
        )

        def _on_open(ws: WebSocketApp) -> None:
            LOGGER.info("Subscribing to new listings with payload %s", request_payload)
            ws.send(json.dumps(request_payload))

        ws_app.on_open = _on_open
        ws_app.run_forever()


class BitqueryClient:
    """Minimal helper around the Bitquery GraphQL API."""

    def __init__(self, api_key: str, endpoint: str = "https://graphql.bitquery.io") -> None:
        self.api_key = api_key
        self.endpoint = endpoint
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "X-API-KEY": self.api_key,
            }
        )

    def run_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {"query": query, "variables": variables or {}}
        LOGGER.debug("Executing Bitquery GraphQL with variables %s", variables)
        response = self.session.post(self.endpoint, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        if "errors" in data:
            raise RuntimeError(f"Bitquery error: {data['errors']}")
        return data.get("data", {})

    def get_latest_token_launches(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Return recently minted SPL tokens."""

        query = """
        query ($limit: Int!) {
          solana(network: solana) {
            tokenMintEvents(limit: {count: $limit}, orderBy: {descending: time}) {
              time
              mintAddress
              tokenInfo {
                name
                symbol
              }
            }
          }
        }
        """
        result = self.run_query(query, {"limit": limit})
        events = (
            result.get("solana", {})
            .get("tokenMintEvents", [])
        )
        return list(events)

    def get_token_trade_history(
        self,
        token_address: str,
        *,
        limit: int = 10,
        dex: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return the most recent trades for a token on Solana DEXs."""

        query = """
        query ($limit: Int!, $token: String!, $dex: String) {
          solana(network: solana) {
            dexTrades(
              limit: {count: $limit}
              orderBy: {descending: blockTime}
              where: {
                baseCurrency: {is: $token}
                dexName: {is: $dex}
              }
            ) {
              blockTime
              tradeAmount(in: USD)
              baseAmount
              quoteAmount
              price
              exchange {
                fullName
              }
            }
          }
        }
        """
        variables = {"limit": limit, "token": token_address, "dex": dex}
        result = self.run_query(query, variables)
        trades = result.get("solana", {}).get("dexTrades", [])
        return list(trades)


# ----------------------------------------------------------------------
# CLI helpers
# ----------------------------------------------------------------------

def _print_table(title: str, rows: Iterable[Dict[str, Any]], columns: List[str]) -> None:
    rows = list(rows)
    if not rows:
        LOGGER.info("No data returned for %s", title)
        return

    LOGGER.info("%s", title)
    header = " | ".join(columns)
    LOGGER.info("%s", header)
    LOGGER.info("-" * len(header))
    for row in rows:
        values = [str(row.get(column, "")) for column in columns]
        LOGGER.info(" | ".join(values))


def main() -> None:
    load_dotenv()
    birdeye_key = os.getenv("BIRDEYE_API_KEY")
    bitquery_key = os.getenv("BITQUERY_API_KEY")

    if not birdeye_key:
        LOGGER.error("BIRDEYE_API_KEY is not configured. Set it in your environment or .env file.")
    else:
        birdeye = BirdEyeClient(api_key=birdeye_key)
        try:
            trending = birdeye.get_trending_tokens(limit=5)
            _print_table(
                "BirdEye Trending Tokens",
                trending,
                ["rank", "symbol", "name", "liquidity", "volume24hUSD"],
            )
        except Exception as exc:  # pragma: no cover - network call
            LOGGER.error("Failed to fetch trending tokens: %s", exc)
            trending = []

        try:
            meme_tokens = birdeye.get_meme_token_list(limit=5)
            _print_table(
                "BirdEye Meme Token Catalogue",
                meme_tokens,
                ["symbol", "name", "address", "price", "marketCap", "popularityScore"],
            )
        except Exception as exc:  # pragma: no cover - network call
            LOGGER.error("Failed to fetch meme token list: %s", exc)
            meme_tokens = []

        if trending:
            first_token = trending[0]
            address = first_token.get("address")
            if address:
                try:
                    detail = birdeye.get_meme_token_detail(address)
                    LOGGER.info("Detailed stats for %s (%s):\n%s", first_token.get("name"), first_token.get("symbol"), json.dumps(detail, indent=2))
                except Exception as exc:  # pragma: no cover - network call
                    LOGGER.error("Failed to fetch meme token detail for %s: %s", address, exc)

        # Uncomment the following to monitor listings in real time.
        # def _handle_listing(payload: Dict[str, Any]) -> None:
        #     LOGGER.info("New listing received: %s", json.dumps(payload, indent=2))
        # birdeye.subscribe_new_listings(_handle_listing, meme_only=True)

    if not bitquery_key:
        LOGGER.error("BITQUERY_API_KEY is not configured. Set it in your environment or .env file.")
        return

    bitquery = BitqueryClient(api_key=bitquery_key)
    try:
        launches = bitquery.get_latest_token_launches(limit=5)
        _print_table(
            "Bitquery – Latest Token Launches",
            launches,
            ["time", "mintAddress", "tokenInfo"],
        )
    except Exception as exc:  # pragma: no cover - network call
        LOGGER.error("Failed to fetch latest token launches: %s", exc)
        launches = []

    # Use the first launch (or the first trending token) as an example for trade history.
    token_address: Optional[str] = None
    if launches:
        token_address = launches[0].get("mintAddress")

    if not token_address:
        LOGGER.info("No token address available for trade history demo; skipping Bitquery trade history call.")
        return

    try:
        trades = bitquery.get_token_trade_history(token_address, limit=5)
        _print_table(
            "Bitquery – Recent Trades",
            trades,
            ["blockTime", "tradeAmount", "baseAmount", "quoteAmount", "price"],
        )
    except Exception as exc:  # pragma: no cover - network call
        LOGGER.error("Failed to fetch trade history for %s: %s", token_address, exc)


if __name__ == "__main__":  # pragma: no cover - entry point
    main()
